extends SceneTree


func _init() -> void:
	var options := _parse_options(OS.get_cmdline_user_args())
	var private_path := str(options.get("private", ""))
	var public_path := str(options.get("public", ""))
	var force := str(options.get("force", "false")).to_lower() == "true"
	if private_path.is_empty() or public_path.is_empty():
		_fail("Both --private and --public are required.")
		return
	if not force and (FileAccess.file_exists(private_path) or FileAccess.file_exists(public_path)):
		_fail("Refusing to overwrite an existing signing key without --force=true.")
		return

	for path in [private_path, public_path]:
		var directory_error := DirAccess.make_dir_recursive_absolute(path.get_base_dir())
		if directory_error != OK:
			_fail("Cannot create key directory: %s" % error_string(directory_error))
			return

	var key := Crypto.new().generate_rsa(3072)
	if key == null:
		_fail("Godot could not generate an RSA key.")
		return
	var private_error := key.save(private_path, false)
	if private_error != OK:
		_fail("Cannot save private key: %s" % error_string(private_error))
		return
	var public_error := key.save(public_path, true)
	if public_error != OK:
		_fail("Cannot save public key: %s" % error_string(public_error))
		return

	print("Generated update signing key pair.")
	quit()


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
