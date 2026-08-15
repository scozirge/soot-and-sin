extends SceneTree

const BundleManifestScript = preload("res://src/content/bundle_manifest.gd")


func _init() -> void:
	var manifest_path := _option_value("release-manifest")
	if manifest_path.is_empty():
		_fail("Missing --release-manifest option.")
		return

	var manifest_result: Dictionary = BundleManifestScript.read_file(manifest_path, true)
	if not bool(manifest_result.get("ok", false)):
		_fail(str(manifest_result.get("error", "Candidate manifest is invalid.")))
		return
	var manifest: Dictionary = manifest_result.get("data", {})
	var preflight: Dictionary = BundleManifestScript.preflight(
		manifest,
		manifest_path.get_base_dir()
	)
	if not bool(preflight.get("ok", false)):
		_fail(str(preflight.get("error", "Candidate bundle preflight failed.")))
		return

	var entries: Array = preflight.get("entries", [])
	entries.sort_custom(_bundle_priority_less)
	for entry_variant in entries:
		var entry: Dictionary = entry_variant
		var bundle_path := str(entry.get("_resolved_path", ""))
		if not ProjectSettings.load_resource_pack(bundle_path, false):
			_fail("Godot rejected candidate bundle: %s" % bundle_path)
			return

	var entry_scene := str(manifest.get("entry_scene", ""))
	if not ResourceLoader.exists(entry_scene, "PackedScene"):
		_fail("Candidate entry scene is missing after mounting packs: %s" % entry_scene)
		return
	var packed_scene := ResourceLoader.load(entry_scene, "PackedScene") as PackedScene
	if packed_scene == null:
		_fail("Candidate entry scene could not be parsed: %s" % entry_scene)
		return
	var instance := packed_scene.instantiate()
	if instance == null:
		_fail("Candidate entry scene could not be instantiated: %s" % entry_scene)
		return
	if not instance.has_method("startup_candidate_id"):
		_fail("Candidate entry script did not compile or expose its startup contract.")
		return
	if str(instance.call("startup_candidate_id")) != "gameplay-logic":
		_fail("Candidate entry script returned an unexpected startup identity.")
		return
	root.add_child(instance)
	await process_frame
	print("STARTUP_CANDIDATE_READY: %s" % entry_scene)
	quit()


func _bundle_priority_less(left: Dictionary, right: Dictionary) -> bool:
	var left_kind := str(left.get("kind", "content"))
	var right_kind := str(right.get("kind", "content"))
	if left_kind != right_kind:
		return left_kind == "logic"
	return int(left.get("priority", 0)) < int(right.get("priority", 0))


func _option_value(key: String) -> String:
	var prefix := "--%s=" % key
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with(prefix):
			return argument.trim_prefix(prefix)
	return ""


func _fail(message: String) -> void:
	push_error(message)
	quit(1)
