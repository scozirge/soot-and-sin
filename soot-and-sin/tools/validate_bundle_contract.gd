extends SceneTree

const BundleManifestScript = preload("res://src/content/bundle_manifest.gd")


func _init() -> void:
	var builtin := BundleManifestScript.read_file(AppConfig.BUILTIN_MANIFEST_PATH)
	if not bool(builtin.get("ok", false)):
		_fail(str(builtin.get("error", "Builtin manifest is invalid.")))
		return

	var invalid_manifest: Dictionary = builtin.get("data", {}).duplicate(true)
	invalid_manifest["core_api_version"] = AppConfig.CORE_API_VERSION + 1
	if BundleManifestScript.validate(invalid_manifest).is_empty():
		_fail("A manifest with an incompatible Core API was accepted.")
		return

	var release_manifest_path := _option_value("release-manifest")
	if not release_manifest_path.is_empty():
		var release := BundleManifestScript.read_file(release_manifest_path, true)
		if not bool(release.get("ok", false)):
			_fail(str(release.get("error", "Release manifest is invalid.")))
			return
		var signed_document := str(release.get("document_text", ""))
		var tampered_document := _tamper_signature(signed_document)
		var tampered := BundleManifestScript.parse_json(
			tampered_document,
			"tampered release manifest",
			true
		)
		if bool(tampered.get("ok", false)):
			_fail("A release manifest with a tampered signature was accepted.")
			return
		var preflight := BundleManifestScript.preflight(
			release.get("data", {}),
			release_manifest_path.get_base_dir()
		)
		if not bool(preflight.get("ok", false)):
			_fail(str(preflight.get("error", "Release bundle preflight failed.")))
			return

	print("Bundle contract validation passed.")
	quit()


func _tamper_signature(document: String) -> String:
	var json := JSON.new()
	if json.parse(document) != OK or typeof(json.data) != TYPE_DICTIONARY:
		return document + "tampered"
	var envelope: Dictionary = json.data
	var signature := str(envelope.get("signature_base64", ""))
	if signature.is_empty():
		return document + "tampered"
	var first_character := "A" if signature[0] != "A" else "B"
	envelope["signature_base64"] = first_character + signature.substr(1)
	return JSON.stringify(envelope)


func _option_value(key: String) -> String:
	var prefix := "--%s=" % key
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with(prefix):
			return argument.trim_prefix(prefix)
	return ""


func _fail(message: String) -> void:
	push_error(message)
	quit(1)
