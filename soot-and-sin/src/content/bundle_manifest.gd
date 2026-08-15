class_name BundleManifest
extends RefCounted


static func read_file(path: String, require_signature := false) -> Dictionary:
	var json_text := FileAccess.get_file_as_string(path)
	if json_text.is_empty() and FileAccess.get_open_error() != OK:
		return {
			"ok": false,
			"error": "%s could not be read." % path,
		}
	return parse_json(json_text, path, require_signature)


static func parse_json(
	json_text: String,
	source: String,
	require_signature := false
) -> Dictionary:
	var document_result := _parse_dictionary(json_text, source)
	if not bool(document_result.get("ok", false)):
		return document_result
	var document: Dictionary = document_result.get("data", {})

	if document.has("envelope_schema_version"):
		return _open_signed_envelope(document, json_text, source)
	if require_signature:
		return {
			"ok": false,
			"error": "%s must be signed by a trusted update key." % source,
		}
	return _validated_manifest(document, json_text, source, false, "builtin")


static func validate(manifest: Dictionary) -> String:
	if int(manifest.get("schema_version", -1)) != AppConfig.BUNDLE_MANIFEST_SCHEMA_VERSION:
		return "Unsupported manifest schema version."
	if str(manifest.get("core_version", "")) != AppConfig.APP_VERSION:
		return "The manifest targets a different Core version."
	if int(manifest.get("core_api_version", -1)) != AppConfig.CORE_API_VERSION:
		return "The manifest targets a different core API version."
	if int(manifest.get("logic_contract_version", -1)) != AppConfig.LOGIC_CONTRACT_VERSION:
		return "The manifest targets a different logic contract version."
	if str(manifest.get("engine_version", "")) != AppConfig.ENGINE_MAJOR_MINOR:
		return "The manifest targets a different Godot major/minor version."
	if str(manifest.get("update_channel", "")) != AppConfig.UPDATE_CHANNEL:
		return "The manifest targets a different update channel."
	if str(manifest.get("logic_version", "")).is_empty():
		return "logic_version is required."
	if str(manifest.get("content_version", "")).is_empty():
		return "content_version is required."

	var entry_scene := str(manifest.get("entry_scene", ""))
	if not entry_scene.is_empty() and not _is_safe_logic_entry(entry_scene):
		return "entry_scene must be a scene below res://logic/."
	var catalog_path := str(manifest.get("catalog_path", ""))
	if not catalog_path.is_empty() and not _is_safe_catalog_path(catalog_path):
		return "catalog_path must be a JSON file below res://content/bundles/."

	var bundles_variant: Variant = manifest.get("bundles", [])
	if typeof(bundles_variant) != TYPE_ARRAY:
		return "bundles must be an array."

	var seen_ids: Dictionary = {}
	var seen_files: Dictionary = {}
	var required_logic_count := 0
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

		var kind := str(entry.get("kind", ""))
		if kind not in ["logic", "content"]:
			return "Bundle '%s' has an invalid kind." % bundle_id
		if kind == "logic" and bool(entry.get("required", true)):
			required_logic_count += 1
		if str(entry.get("version", "")).is_empty():
			return "Bundle '%s' has no version." % bundle_id
		var file_name := str(entry.get("file", ""))
		if not _is_safe_bundle_file_name(file_name):
			return "Bundle '%s' has an unsafe file name." % bundle_id
		if seen_files.has(file_name):
			return "Duplicate bundle file: '%s'." % file_name
		seen_files[file_name] = true

		var expected_hash := str(entry.get("sha256", "")).to_lower()
		if not _is_sha256(expected_hash):
			return "Bundle '%s' must provide a SHA-256 hash." % bundle_id
		if int(entry.get("bytes", 0)) < 1:
			return "Bundle '%s' must provide its byte size." % bundle_id

	if not entry_scene.is_empty() and required_logic_count < 1:
		return "A startup entry_scene requires at least one required logic bundle."
	return ""


static func preflight(manifest: Dictionary, bundle_directory: String) -> Dictionary:
	var checked_entries: Array = []
	var warnings: Array[String] = []

	for entry_variant in manifest.get("bundles", []):
		var entry: Dictionary = entry_variant
		var file_name := str(entry.get("file", ""))
		var bundle_path := bundle_directory.path_join(file_name)
		var required := bool(entry.get("required", true))
		var problem := _validate_local_bundle(entry, bundle_path)

		if not problem.is_empty():
			if required:
				return {"ok": false, "error": problem}
			warnings.append(problem)
			continue

		var checked_entry := entry.duplicate(true)
		checked_entry["_resolved_path"] = bundle_path
		checked_entries.append(checked_entry)

	return {
		"ok": true,
		"entries": checked_entries,
		"warnings": warnings,
	}


static func bundle_matches(entry: Dictionary, path: String) -> bool:
	return _validate_local_bundle(entry, path).is_empty()


static func local_bundle_error(entry: Dictionary, path: String) -> String:
	return _validate_local_bundle(entry, path)


static func fallback() -> Dictionary:
	return {
		"schema_version": AppConfig.BUNDLE_MANIFEST_SCHEMA_VERSION,
		"core_version": AppConfig.APP_VERSION,
		"core_api_version": AppConfig.CORE_API_VERSION,
		"logic_contract_version": AppConfig.LOGIC_CONTRACT_VERSION,
		"engine_version": AppConfig.ENGINE_MAJOR_MINOR,
		"update_channel": AppConfig.UPDATE_CHANNEL,
		"logic_version": "builtin",
		"content_version": "builtin",
		"entry_scene": "",
		"catalog_path": "",
		"bundles": [],
	}


static func _open_signed_envelope(
	envelope: Dictionary,
	document_text: String,
	source: String
) -> Dictionary:
	if int(envelope.get("envelope_schema_version", -1)) != AppConfig.SIGNED_MANIFEST_ENVELOPE_VERSION:
		return {"ok": false, "error": "%s has an unsupported signature envelope." % source}
	var key_id := str(envelope.get("key_id", ""))
	var key_path := str(AppConfig.TRUSTED_UPDATE_PUBLIC_KEYS.get(key_id, ""))
	if key_path.is_empty():
		return {"ok": false, "error": "%s uses an untrusted update key." % source}

	var payload_bytes := Marshalls.base64_to_raw(str(envelope.get("payload_base64", "")))
	var signature := Marshalls.base64_to_raw(str(envelope.get("signature_base64", "")))
	if payload_bytes.is_empty() or signature.is_empty():
		return {"ok": false, "error": "%s has an invalid signed payload." % source}
	var public_key := CryptoKey.new()
	var key_error := public_key.load(key_path, true)
	if key_error != OK:
		return {
			"ok": false,
			"error": "%s cannot load trusted update key '%s'." % [source, key_id],
		}
	var verified := Crypto.new().verify(
		HashingContext.HASH_SHA256,
		_sha256(payload_bytes),
		signature,
		public_key
	)
	if not verified:
		return {"ok": false, "error": "%s failed update signature verification." % source}

	var payload_text := payload_bytes.get_string_from_utf8()
	var payload_result := _parse_dictionary(payload_text, "%s payload" % source)
	if not bool(payload_result.get("ok", false)):
		return payload_result
	return _validated_manifest(
		payload_result.get("data", {}),
		document_text,
		source,
		true,
		key_id
	)


static func _validated_manifest(
	manifest: Dictionary,
	document_text: String,
	source: String,
	signed: bool,
	key_id: String
) -> Dictionary:
	var validation_error := validate(manifest)
	if not validation_error.is_empty():
		return {
			"ok": false,
			"error": "%s: %s" % [source, validation_error],
		}
	return {
		"ok": true,
		"data": manifest,
		"document_text": document_text,
		"signed": signed,
		"key_id": key_id,
	}


static func _parse_dictionary(json_text: String, source: String) -> Dictionary:
	var json := JSON.new()
	var parse_error := json.parse(json_text)
	if parse_error != OK:
		return {
			"ok": false,
			"error": "%s:%d: %s" % [
				source,
				json.get_error_line(),
				json.get_error_message(),
			],
		}
	if typeof(json.data) != TYPE_DICTIONARY:
		return {"ok": false, "error": "%s must contain a JSON object." % source}
	return {"ok": true, "data": json.data}


static func _sha256(bytes: PackedByteArray) -> PackedByteArray:
	var context := HashingContext.new()
	context.start(HashingContext.HASH_SHA256)
	context.update(bytes)
	return context.finish()


static func _validate_local_bundle(entry: Dictionary, path: String) -> String:
	var file_name := str(entry.get("file", ""))
	if not FileAccess.file_exists(path):
		return "Missing bundle: %s" % file_name

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return "Cannot read bundle: %s" % file_name
	var expected_bytes := int(entry.get("bytes", 0))
	var actual_bytes := file.get_length()
	file.close()
	if actual_bytes != expected_bytes:
		return "Byte size mismatch for bundle: %s" % file_name

	var actual_hash := FileAccess.get_sha256(path).to_lower()
	var expected_hash := str(entry.get("sha256", "")).to_lower()
	if actual_hash != expected_hash:
		return "SHA-256 mismatch for bundle: %s" % file_name
	return ""


static func _is_safe_identifier(value: String) -> bool:
	if value.is_empty():
		return false
	for index in value.length():
		if not "abcdefghijklmnopqrstuvwxyz0123456789_-".contains(value[index]):
			return false
	return true


static func _is_safe_bundle_file_name(value: String) -> bool:
	return (
		not value.is_empty()
		and value == value.get_file()
		and not value.contains("..")
		and value.get_extension().to_lower() == "pck"
	)


static func _is_sha256(value: String) -> bool:
	if value.length() != 64:
		return false
	for index in value.length():
		if not "0123456789abcdef".contains(value[index]):
			return false
	return true


static func _is_safe_catalog_path(value: String) -> bool:
	return (
		value.begins_with("res://content/bundles/")
		and value.ends_with(".json")
		and not value.contains("..")
	)


static func _is_safe_logic_entry(value: String) -> bool:
	return (
		value.begins_with("res://logic/")
		and value.ends_with(".tscn")
		and not value.contains("..")
	)
