extends Node

const BundleManifestScript = preload("res://src/content/bundle_manifest.gd")
const RemoteBundleSourceScript = preload("res://src/content/remote_bundle_source.gd")
const RuntimePlatformScript = preload("res://src/platform/runtime_platform.gd")

signal startup_progress(message: String, progress: float)
signal bundle_loaded(bundle_id: String, bundle_version: String)
signal bundle_failed(bundle_id: String, reason: String)

var _active_manifest: Dictionary = {}
var _active_manifest_path := ""
var _loaded_bundles: Dictionary = {}
var _warnings: Array[String] = []


func initialize() -> Dictionary:
	_active_manifest = {}
	_active_manifest_path = ""
	_loaded_bundles.clear()
	_warnings.clear()
	_set_progress("正在檢查行囊……", 0.04)

	var directory_error := _ensure_runtime_directories()
	if directory_error != OK:
		return _failure_report(
			"Cannot create the bundle directory: %s" % error_string(directory_error)
		)

	var remote_manifest_url: String = RuntimePlatformScript.content_manifest_url()
	if not remote_manifest_url.is_empty():
		_set_progress("正在尋找最新的路標……", 0.1)
		var sync_report := await _sync_remote_content(remote_manifest_url)
		if not bool(sync_report.get("ok", false)):
			_warnings.append(str(sync_report.get("error", "Remote content is unavailable.")))
		else:
			_warnings.append_array(sync_report.get("warnings", []))

	_set_progress("正在核對旅途紀錄……", 0.68)
	var selection := _select_manifest()
	if not bool(selection.get("ok", false)):
		return _failure_report(str(selection.get("error", "No valid content manifest.")))

	_active_manifest = selection.get("manifest", {})
	_active_manifest_path = str(selection.get("path", ""))
	_warnings.append_array(selection.get("warnings", []))

	var entries: Array = selection.get("entries", [])
	entries.sort_custom(_bundle_priority_less)
	for index in entries.size():
		var entry: Dictionary = entries[index]
		var bundle_id := str(entry.get("id", "unknown"))
		var bundle_version := str(entry.get("version", "unknown"))
		var bundle_path := str(entry.get("_resolved_path", ""))
		var ratio := 0.72 + (float(index) / maxf(float(entries.size()), 1.0)) * 0.22
		_set_progress("正在展開第 %d 份旅途記錄……" % (index + 1), ratio)

		if not ProjectSettings.load_resource_pack(bundle_path, false):
			var reason := "Godot rejected bundle '%s'." % bundle_path
			bundle_failed.emit(bundle_id, reason)
			if bool(entry.get("required", true)):
				return _failure_report(reason)
			_warnings.append(reason)
			continue

		_loaded_bundles[bundle_id] = {
			"version": bundle_version,
			"path": bundle_path,
		}
		bundle_loaded.emit(bundle_id, bundle_version)

	_set_progress("道路已經打開。", 1.0)
	for warning in _warnings:
		push_warning(warning)
	return {
		"ok": true,
		"content_version": get_active_content_version(),
		"manifest_path": _active_manifest_path,
		"loaded_bundle_count": _loaded_bundles.size(),
		"warnings": _warnings.duplicate(),
	}


func get_active_content_version() -> String:
	return str(_active_manifest.get("content_version", "builtin"))


func get_active_logic_version() -> String:
	return str(_active_manifest.get("logic_version", "builtin"))


func get_entry_scene() -> String:
	var entry_scene := str(_active_manifest.get("entry_scene", ""))
	if entry_scene.is_empty():
		return AppConfig.FALLBACK_ENTRY_SCENE
	return entry_scene


func get_active_catalog_path() -> String:
	return str(_active_manifest.get("catalog_path", ""))


func get_loaded_bundle_ids() -> PackedStringArray:
	var result := PackedStringArray()
	for bundle_id in _loaded_bundles.keys():
		result.append(str(bundle_id))
	return result


func get_warnings() -> Array[String]:
	return _warnings.duplicate()


func get_status_summary() -> String:
	return "Logic %s · Content %s · %d bundle(s)" % [
		get_active_logic_version(),
		get_active_content_version(),
		_loaded_bundles.size(),
	]


func reject_active_manifest_for_next_start(reason: String) -> void:
	if _active_manifest_path != AppConfig.ACTIVE_MANIFEST_PATH:
		return
	var rejected_path := AppConfig.BUNDLE_STAGING_DIRECTORY.path_join(
		"rejected_manifest.json"
	)
	_remove_file_if_present(rejected_path)
	var move_error := DirAccess.rename_absolute(
		ProjectSettings.globalize_path(AppConfig.ACTIVE_MANIFEST_PATH),
		ProjectSettings.globalize_path(rejected_path)
	)
	if move_error != OK:
		_remove_file_if_present(AppConfig.ACTIVE_MANIFEST_PATH)
	push_error("Rejected active startup manifest: %s" % reason)


func _sync_remote_content(manifest_url: String) -> Dictionary:
	var source = RemoteBundleSourceScript.new(self)
	var fetch_report: Dictionary = await source.fetch_manifest(manifest_url)
	if not bool(fetch_report.get("ok", false)):
		return fetch_report

	var manifest: Dictionary = fetch_report.get("data", {})
	var manifest_document := str(fetch_report.get("document_text", ""))
	if manifest_document.is_empty():
		return {"ok": false, "error": "Signed manifest document is missing."}
	var warnings: Array[String] = []
	var entries: Array = manifest.get("bundles", [])
	for index in entries.size():
		var entry: Dictionary = entries[index]
		var file_name := str(entry.get("file", ""))
		var installed_path := AppConfig.BUNDLE_DIRECTORY.path_join(file_name)
		if BundleManifestScript.bundle_matches(entry, installed_path):
			continue

		var ratio := 0.16 + (float(index) / maxf(float(entries.size()), 1.0)) * 0.46
		_set_progress("正在取得第 %d 份旅途記錄……" % (index + 1), ratio)
		var staged_path := AppConfig.BUNDLE_STAGING_DIRECTORY.path_join(file_name)
		var download_report: Dictionary = await source.download(
			_bundle_url(manifest_url, file_name),
			staged_path
		)
		if not bool(download_report.get("ok", false)):
			var download_error := "%s: %s" % [
				file_name,
				str(download_report.get("error", "Download failed.")),
			]
			if bool(entry.get("required", true)):
				return {"ok": false, "error": download_error}
			warnings.append(download_error)
			continue

		var staged_error: String = BundleManifestScript.local_bundle_error(entry, staged_path)
		if not staged_error.is_empty():
			var validation_error := "Downloaded bundle failed validation: %s" % staged_error
			_remove_file_if_present(staged_path)
			if bool(entry.get("required", true)):
				return {"ok": false, "error": validation_error}
			warnings.append(validation_error)
			continue

		var promote_error := _promote_bundle(staged_path, installed_path)
		if promote_error != OK:
			var promote_reason := "Cannot install %s: %s" % [
				file_name,
				error_string(promote_error),
			]
			if bool(entry.get("required", true)):
				return {"ok": false, "error": promote_reason}
			warnings.append(promote_reason)

	var write_error := _write_active_manifest(manifest_document)
	if not write_error.is_empty():
		return {"ok": false, "error": write_error}
	return {
		"ok": true,
		"warnings": warnings,
	}


func _ensure_runtime_directories() -> Error:
	for virtual_path in [
		AppConfig.BUNDLE_DIRECTORY,
		AppConfig.BUNDLE_STAGING_DIRECTORY,
	]:
		var absolute_path := ProjectSettings.globalize_path(virtual_path)
		var error := DirAccess.make_dir_recursive_absolute(absolute_path)
		if error != OK:
			return error
	return OK


func _select_manifest() -> Dictionary:
	var candidates := [
		{"path": AppConfig.ACTIVE_MANIFEST_PATH, "require_signature": true},
		{"path": AppConfig.PREVIOUS_MANIFEST_PATH, "require_signature": true},
		{"path": AppConfig.BUILTIN_MANIFEST_PATH, "require_signature": false},
	]

	for candidate_variant in candidates:
		var candidate: Dictionary = candidate_variant
		var manifest_path := str(candidate.get("path", ""))
		if not FileAccess.file_exists(manifest_path):
			continue

		var read_result: Dictionary = BundleManifestScript.read_file(
			manifest_path,
			bool(candidate.get("require_signature", false))
		)
		if not bool(read_result.get("ok", false)):
			_warnings.append(str(read_result.get("error", "Invalid JSON manifest.")))
			continue

		var manifest: Dictionary = read_result.get("data", {})
		var preflight: Dictionary = BundleManifestScript.preflight(
			manifest,
			AppConfig.BUNDLE_DIRECTORY
		)
		if not bool(preflight.get("ok", false)):
			_warnings.append("%s: %s" % [
				manifest_path,
				str(preflight.get("error", "Bundle preflight failed.")),
			])
			continue

		return {
			"ok": true,
			"path": manifest_path,
			"manifest": manifest,
			"entries": preflight.get("entries", []),
			"warnings": preflight.get("warnings", []),
		}

	return {
		"ok": true,
		"path": "compiled fallback",
		"manifest": BundleManifestScript.fallback(),
		"entries": [],
		"warnings": [],
	}


func _write_active_manifest(manifest_document: String) -> String:
	var staged_manifest := AppConfig.BUNDLE_STAGING_DIRECTORY.path_join(
		"active_manifest.json.part"
	)
	var file := FileAccess.open(staged_manifest, FileAccess.WRITE)
	if file == null:
		return "Cannot write the staged content manifest."
	file.store_string(manifest_document)
	file.flush()
	file.close()

	var staged_validation: Dictionary = BundleManifestScript.read_file(staged_manifest, true)
	if not bool(staged_validation.get("ok", false)):
		_remove_file_if_present(staged_manifest)
		return str(staged_validation.get("error", "Staged manifest validation failed."))

	if FileAccess.file_exists(AppConfig.ACTIVE_MANIFEST_PATH):
		_remove_file_if_present(AppConfig.PREVIOUS_MANIFEST_PATH)
		var copy_error := DirAccess.copy_absolute(
			ProjectSettings.globalize_path(AppConfig.ACTIVE_MANIFEST_PATH),
			ProjectSettings.globalize_path(AppConfig.PREVIOUS_MANIFEST_PATH)
		)
		if copy_error != OK:
			_remove_file_if_present(staged_manifest)
			return "Cannot preserve previous content manifest: %s" % error_string(copy_error)

	_remove_file_if_present(AppConfig.ACTIVE_MANIFEST_PATH)
	var promote_error := DirAccess.rename_absolute(
		ProjectSettings.globalize_path(staged_manifest),
		ProjectSettings.globalize_path(AppConfig.ACTIVE_MANIFEST_PATH)
	)
	if promote_error != OK:
		return "Cannot activate content manifest: %s" % error_string(promote_error)
	return ""


func _promote_bundle(staged_path: String, installed_path: String) -> Error:
	_remove_file_if_present(installed_path)
	return DirAccess.rename_absolute(
		ProjectSettings.globalize_path(staged_path),
		ProjectSettings.globalize_path(installed_path)
	)


func _remove_file_if_present(path: String) -> void:
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path))


func _bundle_url(manifest_url: String, file_name: String) -> String:
	var final_slash := manifest_url.rfind("/")
	if final_slash < 0:
		return file_name
	return manifest_url.left(final_slash + 1) + file_name.uri_encode()


func _bundle_priority_less(left: Dictionary, right: Dictionary) -> bool:
	var left_kind := str(left.get("kind", "content"))
	var right_kind := str(right.get("kind", "content"))
	if left_kind != right_kind:
		return left_kind == "logic"
	var left_required := bool(left.get("required", true))
	var right_required := bool(right.get("required", true))
	if left_required != right_required:
		return left_required
	return int(left.get("priority", 0)) < int(right.get("priority", 0))


func _set_progress(message: String, progress: float) -> void:
	startup_progress.emit(message, clampf(progress, 0.0, 1.0))


func _failure_report(reason: String) -> Dictionary:
	push_error(reason)
	return {
		"ok": false,
		"error": reason,
		"warnings": _warnings.duplicate(),
	}
