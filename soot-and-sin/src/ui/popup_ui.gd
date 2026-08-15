class_name SootPopupUI
extends Control

signal resolved(confirmed: bool)

@onready var _popup_root: Control = %PopupRoot
@onready var _dimmer: Button = %Dimmer
@onready var _panel: PanelContainer = %Panel
@onready var _title_label: Label = %PopupTitle
@onready var _content_label: Label = %PopupContent
@onready var _cancel_button: Button = %CancelButton
@onready var _confirm_button: Button = %ConfirmButton
@onready var _loading_root: Control = %LoadingRoot
@onready var _loading_blocker: Button = %LoadingBlocker
@onready var _loading_label: Label = %LoadingLabel

var _current_request: Dictionary = {}
var _loading_requests: Dictionary = {}
var _open_tween: Tween
var _loading_tween: Tween


func _ready() -> void:
	_popup_root.hide()
	_loading_root.hide()
	_dimmer.pressed.connect(_on_backdrop_pressed)
	_cancel_button.pressed.connect(_finish.bind(false))
	_confirm_button.pressed.connect(_finish.bind(true))
	visibility_changed.connect(_bring_to_front)
	call_deferred("_prepare_panel_pivot")


func open_popup(request: Dictionary) -> void:
	if _popup_root.visible:
		_finish(false)
	_current_request = request.duplicate(true)
	_title_label.text = str(request.get("title", "系統訊息"))
	_content_label.text = str(request.get("content", ""))
	_confirm_button.text = str(request.get("confirm_text", "確認"))
	_cancel_button.text = str(request.get("cancel_text", "取消"))
	_cancel_button.visible = bool(request.get("show_cancel", false))
	_popup_root.show()
	_bring_to_front()
	_play_open_motion(float(request.get("fade_in_seconds", 0.18)))


func message(content: String, title := "系統訊息") -> void:
	open_popup({
		"title": title,
		"content": content,
		"show_cancel": false,
	})


func confirm(content: String, title := "請確認") -> void:
	open_popup({
		"title": title,
		"content": content,
		"show_cancel": true,
	})


func show_loading(key: String, text := "正在處理……", block_input := true) -> void:
	if key.is_empty():
		return
	_loading_requests.erase(key)
	_loading_requests[key] = {
		"text": text,
		"block_input": block_input,
	}
	_loading_label.text = text
	_loading_blocker.mouse_filter = (
		Control.MOUSE_FILTER_STOP if _has_blocking_loading_request() else Control.MOUSE_FILTER_IGNORE
	)
	_loading_root.show()
	_bring_to_front()
	_start_loading_blink()


func hide_loading(key: String) -> void:
	_loading_requests.erase(key)
	if _loading_requests.is_empty():
		_loading_root.hide()
		_stop_loading_blink()
		return
	var keys := _loading_requests.keys()
	var request: Dictionary = _loading_requests[keys.back()]
	_loading_label.text = str(request.get("text", "正在處理……"))
	_loading_blocker.mouse_filter = (
		Control.MOUSE_FILTER_STOP if _has_blocking_loading_request() else Control.MOUSE_FILTER_IGNORE
	)


func close_popup() -> void:
	_finish(false)


func _finish(confirmed: bool) -> void:
	if not _popup_root.visible:
		return
	if _open_tween and _open_tween.is_valid():
		_open_tween.kill()
	_popup_root.hide()
	_current_request.clear()
	resolved.emit(confirmed)


func _on_backdrop_pressed() -> void:
	if bool(_current_request.get("close_on_backdrop", false)):
		_finish(false)


func _play_open_motion(seconds: float) -> void:
	if _open_tween and _open_tween.is_valid():
		_open_tween.kill()
	_prepare_panel_pivot()
	_dimmer.modulate.a = 0.0
	_panel.modulate.a = 0.0
	_panel.scale = Vector2(1.04, 1.04)
	_open_tween = create_tween().set_parallel(true)
	_open_tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_open_tween.tween_property(_dimmer, "modulate:a", 1.0, 0.12)
	_open_tween.tween_property(_panel, "modulate:a", 1.0, maxf(0.01, seconds))
	_open_tween.tween_property(_panel, "scale", Vector2.ONE, maxf(0.01, seconds))


func _prepare_panel_pivot() -> void:
	_panel.pivot_offset = _panel.size * 0.5


func _bring_to_front() -> void:
	if get_parent():
		get_parent().move_child(self, get_parent().get_child_count() - 1)


func _has_blocking_loading_request() -> bool:
	for request_variant in _loading_requests.values():
		var request: Dictionary = request_variant
		if bool(request.get("block_input", false)):
			return true
	return false


func _start_loading_blink() -> void:
	_stop_loading_blink()
	_loading_label.modulate.a = 1.0
	_loading_tween = create_tween().set_loops()
	_loading_tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_loading_tween.tween_property(_loading_label, "modulate:a", 0.34, 0.62)
	_loading_tween.tween_property(_loading_label, "modulate:a", 1.0, 0.62)


func _stop_loading_blink() -> void:
	if _loading_tween and _loading_tween.is_valid():
		_loading_tween.kill()
	_loading_label.modulate.a = 1.0
