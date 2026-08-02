extends Control

@onready var _runtime_label: Label = %RuntimeLabel
@onready var _content_label: Label = %ContentLabel


func _ready() -> void:
	_runtime_label.text = AppConfig.runtime_version_label()
	_content_label.text = BundleManager.get_status_summary()
