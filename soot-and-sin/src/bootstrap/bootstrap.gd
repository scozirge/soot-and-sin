extends Control

@onready var _status_label: Label = %StatusLabel
@onready var _version_label: Label = %VersionLabel


func _ready() -> void:
	_version_label.text = AppConfig.runtime_version_label()
	_status_label.text = "Initializing core and validating content bundles…"

	await get_tree().process_frame
	var report := BundleManager.initialize()
	if not bool(report.get("ok", false)):
		_status_label.text = "Startup blocked\n%s" % str(
			report.get("error", "Unknown initialization error.")
		)
		return

	_status_label.text = "Ready · %s" % BundleManager.get_status_summary()
	await get_tree().process_frame

	var change_error := get_tree().change_scene_to_file(AppConfig.DEFAULT_ENTRY_SCENE)
	if change_error != OK:
		_status_label.text = "Cannot open the core shell: %s" % error_string(change_error)
