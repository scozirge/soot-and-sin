extends Control

const PROGRESS_SMOOTHING_RATE := 8.0
const PROGRESS_SNAP_THRESHOLD := 0.001
const LOADING_FADE_OUT_SECONDS := 0.5

@onready var _game_root: Control = %GameRoot
@onready var _loading_overlay: Control = %LoadingOverlay
@onready var _status_label: Label = %StatusLabel
@onready var _percent_label: Label = %PercentLabel
@onready var _version_label: Label = %VersionLabel
@onready var _progress_bar: ProgressBar = %ProgressBar
@onready var _retry_button: Button = %RetryButton

var _is_starting := false
var _game_reported_ready := false
var _is_hiding := false
var _target_progress := 0.0
var _displayed_progress := 0.0


func _ready() -> void:
	add_to_group("startup_loading_host")
	_version_label.text = AppConfig.runtime_version_label()
	BundleManager.startup_progress.connect(_on_startup_progress)
	_retry_button.pressed.connect(_start)
	_start()


func _process(delta: float) -> void:
	if _displayed_progress < _target_progress:
		var remaining := _target_progress - _displayed_progress
		var smoothing := 1.0 - exp(-PROGRESS_SMOOTHING_RATE * maxf(0.0, delta))
		var next_progress := _displayed_progress + remaining * smoothing
		_displayed_progress = (
			_target_progress
			if _target_progress - next_progress <= PROGRESS_SNAP_THRESHOLD
			else next_progress
		)
		_apply_displayed_progress()

	if _game_reported_ready and _displayed_progress >= 0.995 and not _is_hiding:
		_hide_loading_overlay()


func _start() -> void:
	if _is_starting:
		return
	_is_starting = true
	_game_reported_ready = false
	_is_hiding = false
	_target_progress = 0.0
	_displayed_progress = 0.0
	_loading_overlay.modulate.a = 1.0
	_loading_overlay.show()
	_retry_button.hide()
	_clear_game_root()
	_apply_displayed_progress()
	_status_label.text = "正在點亮油燈……"

	await get_tree().process_frame
	var report: Dictionary = await BundleManager.initialize()
	if not bool(report.get("ok", false)):
		_is_starting = false
		_status_label.text = "道路暫時中斷。請檢查連線後再試一次。"
		_retry_button.show()
		push_error(str(report.get("error", "Unknown initialization error.")))
		return

	_target_progress = 1.0
	_status_label.text = "道路已經打開。"
	var entry_scene := BundleManager.get_entry_scene()
	var entry_error := _instantiate_entry(entry_scene)
	if entry_error == OK:
		_is_starting = false
		return

	BundleManager.reject_active_manifest_for_next_start(
		"Cannot open %s: %s" % [entry_scene, error_string(entry_error)]
	)
	if entry_scene != AppConfig.FALLBACK_ENTRY_SCENE:
		var fallback_error := _instantiate_entry(AppConfig.FALLBACK_ENTRY_SCENE)
		if fallback_error == OK:
			_is_starting = false
			return

	_is_starting = false
	_status_label.text = "入口沒有回應。請再試一次。"
	_retry_button.show()
	push_error("Cannot open the startup entry: %s" % error_string(entry_error))


func complete_game_loading() -> void:
	if _game_reported_ready:
		return
	_game_reported_ready = true
	_target_progress = 1.0
	_status_label.text = "準備完成。"


func _instantiate_entry(scene_path: String) -> Error:
	var packed_scene := ResourceLoader.load(scene_path) as PackedScene
	if packed_scene == null:
		return ERR_CANT_OPEN
	var instance := packed_scene.instantiate()
	if instance == null:
		return ERR_CANT_CREATE
	_game_root.add_child(instance)
	return OK


func _hide_loading_overlay() -> void:
	_is_hiding = true
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(_loading_overlay, "modulate:a", 0.0, LOADING_FADE_OUT_SECONDS)
	tween.tween_callback(_loading_overlay.hide)


func _clear_game_root() -> void:
	for child in _game_root.get_children():
		child.queue_free()


func _on_startup_progress(message: String, progress: float) -> void:
	_status_label.text = message
	_target_progress = maxf(_target_progress, clampf(progress, 0.0, 1.0))


func _apply_displayed_progress() -> void:
	var percent := roundi(_displayed_progress * 100.0)
	_progress_bar.value = _displayed_progress * 100.0
	_percent_label.text = "%02d%%" % percent
