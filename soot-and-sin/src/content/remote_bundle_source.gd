class_name RemoteBundleSource
extends RefCounted

const BundleManifestScript = preload("res://src/content/bundle_manifest.gd")

var _host: Node


func _init(host: Node) -> void:
	_host = host


func fetch_manifest(url: String) -> Dictionary:
	var response := await _request(url)
	if not bool(response.get("ok", false)):
		return response

	var body: PackedByteArray = response.get("body", PackedByteArray())
	return BundleManifestScript.parse_json(body.get_string_from_utf8(), url, true)


func download(url: String, destination: String) -> Dictionary:
	var absolute_destination := ProjectSettings.globalize_path(destination)
	var parent_directory := absolute_destination.get_base_dir()
	var directory_error := DirAccess.make_dir_recursive_absolute(parent_directory)
	if directory_error != OK:
		return {
			"ok": false,
			"error": "Cannot create download directory: %s" % error_string(directory_error),
		}

	if FileAccess.file_exists(destination):
		var remove_error := DirAccess.remove_absolute(absolute_destination)
		if remove_error != OK:
			return {
				"ok": false,
				"error": "Cannot replace staged download: %s" % error_string(remove_error),
			}

	if not OS.has_feature("web"):
		return await _request(url, absolute_destination)

	var response := await _request(url)
	if not bool(response.get("ok", false)):
		return response
	var file := FileAccess.open(destination, FileAccess.WRITE)
	if file == null:
		return {
			"ok": false,
			"error": "Cannot write downloaded bundle: %s" % error_string(FileAccess.get_open_error()),
		}
	var body: PackedByteArray = response.get("body", PackedByteArray())
	file.store_buffer(body)
	file.flush()
	file.close()
	return {"ok": true}


func _request(url: String, download_path := "") -> Dictionary:
	var request := HTTPRequest.new()
	request.timeout = AppConfig.HTTP_TIMEOUT_SECONDS
	# Browsers transparently decode compressed responses before Godot receives
	# them. Enabling HTTPRequest gzip handling on Web would decode the already
	# decoded body again and fail before the manifest can be parsed.
	request.accept_gzip = download_path.is_empty() and not OS.has_feature("web")
	request.download_file = download_path
	_host.add_child(request)

	var start_error := request.request(url, PackedStringArray(["Cache-Control: no-cache"]))
	if start_error != OK:
		request.queue_free()
		return {
			"ok": false,
			"error": "Cannot start request: %s" % error_string(start_error),
		}

	var completed: Array = await request.request_completed
	request.queue_free()

	var result := int(completed[0])
	var response_code := int(completed[1])
	var body: PackedByteArray = completed[3]
	if result != HTTPRequest.RESULT_SUCCESS:
		return {
			"ok": false,
			"error": "Network request failed with result %d." % result,
		}
	if response_code < 200 or response_code >= 300:
		return {
			"ok": false,
			"error": "Server returned HTTP %d." % response_code,
		}
	return {
		"ok": true,
		"body": body,
		"response_code": response_code,
	}
