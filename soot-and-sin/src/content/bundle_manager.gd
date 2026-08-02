extends Node

signal bundle_loaded(bundle_id: String, bundle_version: String)
signal bundle_failed(bundle_id: String, reason: String)

var _active_manifest: Dictionary = {}
var _active_manifest_path := ""
var _loaded_bundles: Dictionary = {}
var _warnings: Array[String] = []


func initialize() -> Dictionary:
	_loaded_bundles.clear()
	_warnings.clear()

	var directory_error := _ensure_runtime_directories()
	if directory_error != OK:
		return _failure_report(
			"Cannot create the bundle directory: %s" % error_string(directory_error)
		)

	var selection := _select_manifest()
	if not bool(selection.get("ok", false)):
		return _failure_report(str(selection.get("error", "No valid content manifest.")))

	_active_manifest = selection.get("manifest", {})
	_active_manifest_path = str(selection.get("path", ""))
	_warnings.append_array(selection.get("warnings", []))

	var entries: Array = selection.get("entries", [])
	entries.sort_custom(_bundle_priority_less)

	for entry_variant in entries:
		var entry: Dictionary = entry_variant
		var bundle_id := str(entry.get("id", "unknown"))
		var bundle_version := str(entry.get("version", "unknown"))
		var bundle_path := str(entry.get("_resolved_path", ""))
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

	return {
		"ok": true,
		"content_version": get_active_content_version(),
		"manifest_path": _active_manifest_path,
		"loaded_bundle_count": _loaded_bundles.size(),
		"warnings": _warnings.duplicate(),
	}


func get_active_content_version() -> String:
	return str(_active_manifest.get("content_version", "builtin"))


func get_active_catalog_path() -> String:
	return str(_active_manifest.get("catalog_path", ""))


func get_loaded_bundle_ids() -> PackedStringArray:
	var result := PackedStringArray()
	for bundle_id in _loaded_bundles.keys():
		result.append(str(bundle_id))
	return result


func get_status_summary() -> String:
	return "Content %s · %d bundle(s)" % [
		get_active_content_version(),
		_loaded_bundles.size(),
	]


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
		AppConfig.ACTIVE_MANIFEST_PATH,
		AppConfig.PREVIOUS_MANIFEST_PATH,
		AppConfig.BUILTIN_MANIFEST_PATH,
	]

	for manifest_path in candidates:
		if not FileAccess.file_exists(manifest_path):
			continue

		var read_result := _read_json_dictionary(manifest_path)
		if not bool(read_result.get("ok", false)):
			_warnings.append(str(read_result.get("error", "Invalid JSON manifest.")))
			continue

		var manifest: Dictionary = read_result.get("data", {})
		var validation_error := _validate_manifest(manifest)
		if not validation_error.is_empty():
			_warnings.append("%s: %s" % [manifest_path, validation_error])
			continue

		var preflight := _preflight_manifest(manifest)
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

	var fallback := _fallback_manifest()
	return {
		"ok": true,
		"path": "compiled fallback",
		"manifest": fallback,
		"entries": [],
		"warnings": [],
	}


func _read_json_dictionary(path: String) -> Dictionary:
	var json_text := FileAccess.get_file_as_string(path)
	if json_text.is_empty() and FileAccess.get_open_error() != OK:
		return {
			"ok": false,
			"error": "%s could not be read." % path,
		}

	var json := JSON.new()
	var parse_error := json.parse(json_text)
	if parse_error != OK:
		return {
			"ok": false,
			"error": "%s:%d: %s" % [
				path,
				json.get_error_line(),
				json.get_error_message(),
			],
		}
	if typeof(json.data) != TYPE_DICTIONARY:
		return {
			"ok": false,
			"error": "%s must contain a JSON object." % path,
		}
	return {
		"ok": true,
		"data": json.data,
	}


func _validate_manifest(manifest: Dictionary) -> String:
	if int(manifest.get("schema_version", -1)) != AppConfig.BUNDLE_MANIFEST_SCHEMA_VERSION:
		return "Unsupported manifest schema version."
	if int(manifest.get("core_api_version", -1)) != AppConfig.CORE_API_VERSION:
		return "The manifest targets a different core API version."
	if str(manifest.get("engine_version", "")) != AppConfig.ENGINE_MAJOR_MINOR:
		return "The manifest targets a different Godot major/minor version."
	if str(manifest.get("content_version", "")).is_empty():
		return "content_version is required."

	var catalog_path := str(manifest.get("catalog_path", ""))
	if not catalog_path.is_empty() and not _is_safe_catalog_path(catalog_path):
		return "catalog_path must be a JSON file below res://content/bundles/."

	var bundles_variant: Variant = manifest.get("bundles", [])
	if typeof(bundles_variant) != TYPE_ARRAY:
		return "bundles must be an array."

	var seen_ids: Dictionary = {}
	for entry_variant in bundles_variant:
		if typeof(entry_variant) != TYPE_DICTIONARY:
			return "Every bundle entry must be an object."
		var entry: Dictionary = entry_variant
		var bundle_id := str(entry.get("id", ""))
		if not _is_safe_identifier(bundle_id):
			return "Invalid bundle id: '%s'." % bundle_id
		if seen_ids.has(bundle_id):
			return "Duplicate bundle id: '%s'." % bundle_id
		seen_ids[bundle_id] = true

		if str(entry.get("version", "")).is_empty():
			return "Bundle '%s' has no version." % bundle_id
		var file_name := str(entry.get("file", ""))
		if not _is_safe_bundle_file_name(file_name):
			return "Bundle '%s' has an unsafe file name." % bundle_id
		var expected_hash := str(entry.get("sha256", "")).to_lower()
		if not _is_sha256(expected_hash):
			return "Bundle '%s' must provide a SHA-256 hash." % bundle_id

	return ""


func _preflight_manifest(manifest: Dictionary) -> Dictionary:
	var checked_entries: Array = []
	var warnings: Array[String] = []

	for entry_variant in manifest.get("bundles", []):
		var entry: Dictionary = entry_variant
		var file_name := str(entry.get("file", ""))
		var bundle_path := AppConfig.BUNDLE_DIRECTORY.path_join(file_name)
		var required := bool(entry.get("required", true))

		if not FileAccess.file_exists(bundle_path):
			var missing_reason := "Missing bundle: %s" % file_name
			if required:
				return {"ok": false, "error": missing_reason}
			warnings.append(missing_reason)
			continue

		var actual_hash := FileAccess.get_sha256(bundle_path).to_lower()
		var expected_hash := str(entry.get("sha256", "")).to_lower()
		if actual_hash != expected_hash:
			var hash_reason := "SHA-256 mismatch for bundle: %s" % file_name
			if required:
				return {"ok": false, "error": hash_reason}
			warnings.append(hash_reason)
			continue

		var checked_entry := entry.duplicate(true)
		checked_entry["_resolved_path"] = bundle_path
		checked_entries.append(checked_entry)

	return {
		"ok": true,
		"entries": checked_entries,
		"warnings": warnings,
	}


func _bundle_priority_less(left: Dictionary, right: Dictionary) -> bool:
	var left_required := bool(left.get("required", true))
	var right_required := bool(right.get("required", true))
	if left_required != right_required:
		return left_required
	return int(left.get("priority", 0)) < int(right.get("priority", 0))


func _is_safe_identifier(value: String) -> bool:
	if value.is_empty():
		return false
	for index in value.length():
		var character := value[index]
		if not "abcdefghijklmnopqrstuvwxyz0123456789_-".contains(character):
			return false
	return true


func _is_safe_bundle_file_name(value: String) -> bool:
	return (
		not value.is_empty()
		and value == value.get_file()
		and not value.contains("..")
		and value.get_extension().to_lower() == "pck"
	)


func _is_sha256(value: String) -> bool:
	if value.length() != 64:
		return false
	for index in value.length():
		if not "0123456789abcdef".contains(value[index]):
			return false
	return true


func _is_safe_catalog_path(value: String) -> bool:
	return (
		value.begins_with("res://content/bundles/")
		and value.ends_with(".json")
		and not value.contains("..")
	)


func _fallback_manifest() -> Dictionary:
	return {
		"schema_version": AppConfig.BUNDLE_MANIFEST_SCHEMA_VERSION,
		"core_api_version": AppConfig.CORE_API_VERSION,
		"engine_version": AppConfig.ENGINE_MAJOR_MINOR,
		"content_version": "builtin",
		"catalog_path": "",
		"bundles": [],
	}


func _failure_report(reason: String) -> Dictionary:
	push_error(reason)
	return {
		"ok": false,
		"error": reason,
		"warnings": _warnings.duplicate(),
	}
