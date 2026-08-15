extends SceneTree

const DEFAULT_DEFINITION_PATH := "res://config/bundles/logic_files.json"
const ALLOWED_ROOT := "res://logic/"
const FORBIDDEN_EXTENSIONS := [
	"cs",
	"dll",
	"dylib",
	"exe",
	"pdb",
	"so",
	"wasm",
]


func _init() -> void:
	var options := _parse_options(OS.get_cmdline_user_args())
	var output_path := str(options.get("output", ""))
	var definition_path := str(options.get("definition", DEFAULT_DEFINITION_PATH))
	if output_path.is_empty():
		_fail("Missing --output option.")
		return

	var definition_result := _read_definition(definition_path)
	if not bool(definition_result.get("ok", false)):
		_fail(str(definition_result.get("error", "Invalid logic definition.")))
		return
	var files: Array = definition_result.get("files", [])

	var directory_error := DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	if directory_error != OK:
		_fail("Cannot create logic pack directory: %s" % error_string(directory_error))
		return
	if FileAccess.file_exists(output_path):
		var remove_error := DirAccess.remove_absolute(output_path)
		if remove_error != OK:
			_fail("Cannot replace previous logic pack: %s" % error_string(remove_error))
			return

	var packer := PCKPacker.new()
	var start_error := packer.pck_start(output_path)
	if start_error != OK:
		_fail("Cannot create logic PCK: %s" % error_string(start_error))
		return

	for virtual_path_variant in files:
		var virtual_path := str(virtual_path_variant)
		var source_path := ProjectSettings.globalize_path(virtual_path)
		var add_error := packer.add_file(virtual_path, source_path)
		if add_error != OK:
			_fail("Cannot add %s: %s" % [virtual_path, error_string(add_error)])
			return

	var flush_error := packer.flush()
	if flush_error != OK:
		_fail("Cannot finish logic PCK: %s" % error_string(flush_error))
		return
	print("Wrote startup logic pack with %d file(s): %s" % [files.size(), output_path])
	quit()


func _read_definition(path: String) -> Dictionary:
	var text := FileAccess.get_file_as_string(path)
	var json := JSON.new()
	if json.parse(text) != OK or typeof(json.data) != TYPE_DICTIONARY:
		return {"ok": false, "error": "Cannot parse logic definition: %s" % path}
	var definition: Dictionary = json.data
	if int(definition.get("schema_version", -1)) != 1:
		return {"ok": false, "error": "Unsupported logic definition schema."}

	var entry_scene := str(definition.get("entry_scene", ""))
	var files_variant: Variant = definition.get("files", [])
	if typeof(files_variant) != TYPE_ARRAY or files_variant.is_empty():
		return {"ok": false, "error": "Logic definition must list at least one file."}
	var files: Array = files_variant
	if entry_scene.is_empty() or entry_scene not in files:
		return {"ok": false, "error": "Logic entry_scene must be included in files."}

	var seen: Dictionary = {}
	var script_count := 0
	for virtual_path_variant in files:
		var virtual_path := str(virtual_path_variant)
		if (
			not virtual_path.begins_with(ALLOWED_ROOT)
			or virtual_path.contains("..")
			or virtual_path.ends_with("/")
		):
			return {"ok": false, "error": "Unsafe logic path: %s" % virtual_path}
		var extension := virtual_path.get_extension().to_lower()
		if extension in FORBIDDEN_EXTENSIONS:
			return {"ok": false, "error": "Native executable content is forbidden: %s" % virtual_path}
		if extension == "gd":
			script_count += 1
		if seen.has(virtual_path):
			return {"ok": false, "error": "Duplicate logic path: %s" % virtual_path}
		if not FileAccess.file_exists(virtual_path):
			return {"ok": false, "error": "Logic source is missing: %s" % virtual_path}
		seen[virtual_path] = true
	if script_count < 1:
		return {"ok": false, "error": "Logic pack must include at least one GDScript."}

	return {"ok": true, "files": files, "entry_scene": entry_scene}


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
