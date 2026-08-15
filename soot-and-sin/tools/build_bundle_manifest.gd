extends SceneTree

const TEMPLATE_PATH := "res://config/bundles/builtin_manifest.json"


func _init() -> void:
	var options := _parse_options(OS.get_cmdline_user_args())
	var required_options := [
		"logic-pack",
		"logic-file",
		"logic-version",
		"content-pack",
		"content-file",
		"content-version",
		"entry-scene",
		"output",
		"private-key",
		"key-id",
	]
	for required_key in required_options:
		if not options.has(required_key) or str(options[required_key]).is_empty():
			_fail("Missing --%s option." % required_key)
			return

	var logic_pack_path := str(options["logic-pack"])
	var content_pack_path := str(options["content-pack"])
	for pack_path in [logic_pack_path, content_pack_path]:
		if not FileAccess.file_exists(pack_path):
			_fail("Bundle does not exist: %s" % pack_path)
			return

	var template_result := _read_json_dictionary(TEMPLATE_PATH)
	if not bool(template_result.get("ok", false)):
		_fail(str(template_result.get("error", "Cannot read manifest template.")))
		return
	var manifest: Dictionary = template_result.get("data", {})
	manifest["logic_version"] = str(options["logic-version"])
	manifest["content_version"] = str(options["content-version"])
	manifest["entry_scene"] = str(options["entry-scene"])
	manifest["bundles"] = [
		_bundle_entry(
			"gameplay-logic",
			"logic",
			str(options["logic-version"]),
			str(options["logic-file"]),
			logic_pack_path,
			-100
		),
		_bundle_entry(
			"base-content",
			"content",
			str(options["content-version"]),
			str(options["content-file"]),
			content_pack_path,
			0
		),
	]

	var payload_text := JSON.stringify(manifest, "", true)
	var payload_bytes := payload_text.to_utf8_buffer()
	var private_key := CryptoKey.new()
	var key_error := private_key.load(str(options["private-key"]), false)
	if key_error != OK:
		_fail("Cannot load update signing key: %s" % error_string(key_error))
		return
	var signature := Crypto.new().sign(
		HashingContext.HASH_SHA256,
		_sha256(payload_bytes),
		private_key
	)
	if signature.is_empty():
		_fail("Godot could not sign the update manifest.")
		return

	var envelope := {
		"envelope_schema_version": AppConfig.SIGNED_MANIFEST_ENVELOPE_VERSION,
		"key_id": str(options["key-id"]),
		"payload_base64": Marshalls.raw_to_base64(payload_bytes),
		"signature_base64": Marshalls.raw_to_base64(signature),
	}
	var output_path := str(options["output"])
	var directory_error := DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	if directory_error != OK:
		_fail("Cannot create manifest directory: %s" % error_string(directory_error))
		return
	var output_file := FileAccess.open(output_path, FileAccess.WRITE)
	if output_file == null:
		_fail("Cannot write manifest: %s" % output_path)
		return
	output_file.store_string(JSON.stringify(envelope, "  ", true) + "\n")
	output_file.close()
	print("Wrote signed startup manifest: %s" % output_path)
	quit()


func _bundle_entry(
	bundle_id: String,
	kind: String,
	version: String,
	file_name: String,
	pack_path: String,
	priority: int
) -> Dictionary:
	var pack_file := FileAccess.open(pack_path, FileAccess.READ)
	var pack_bytes := pack_file.get_length()
	pack_file.close()
	return {
		"id": bundle_id,
		"kind": kind,
		"version": version,
		"file": file_name,
		"bytes": pack_bytes,
		"sha256": FileAccess.get_sha256(pack_path).to_lower(),
		"required": true,
		"priority": priority,
	}


func _sha256(bytes: PackedByteArray) -> PackedByteArray:
	var context := HashingContext.new()
	context.start(HashingContext.HASH_SHA256)
	context.update(bytes)
	return context.finish()


func _read_json_dictionary(path: String) -> Dictionary:
	var json := JSON.new()
	var text := FileAccess.get_file_as_string(path)
	if json.parse(text) != OK or typeof(json.data) != TYPE_DICTIONARY:
		return {"ok": false, "error": "Cannot parse %s." % path}
	return {"ok": true, "data": json.data}


func _parse_options(arguments: PackedStringArray) -> Dictionary:
	var options: Dictionary = {}
	for argument in arguments:
		if not argument.begins_with("--") or not argument.contains("="):
			continue
		var separator := argument.find("=")
		options[argument.substr(2, separator - 2)] = argument.substr(separator + 1)
	return options


func _fail(message: String) -> void:
	push_error(message)
	quit(1)
