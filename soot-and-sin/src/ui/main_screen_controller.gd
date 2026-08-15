extends Control

@onready var _screen: Control = $GameScreen
@onready var _popup: SootPopupUI = $GameScreen/PopupUI
@onready var _chapter_label: Label = _screen.get_node("%ChapterLabel")
@onready var _entry_label: Label = _screen.get_node("%EntryLabel")
@onready var _runtime_label: Label = _screen.get_node("%RuntimeLabel")
@onready var _content_label: Label = _screen.get_node("%ContentLabel")
@onready var _enter_button: Button = _screen.get_node("%EnterButton")
@onready var _archive_button: Button = _screen.get_node("%ArchiveButton")
@onready var _settings_button: Button = _screen.get_node("%SettingsButton")
@onready var _silver_button: Button = _screen.get_node("%SilverButton")


func _ready() -> void:
	_enter_button.pressed.connect(_on_enter_pressed)
	_archive_button.pressed.connect(_on_archive_pressed)
	_settings_button.pressed.connect(_on_settings_pressed)
	_silver_button.pressed.connect(_on_silver_pressed)
	_populate_runtime_state()
	var bundle_manager := get_node_or_null("/root/BundleManager")
	var logic_version := "candidate"
	var content_version := "candidate"
	if bundle_manager:
		logic_version = str(bundle_manager.call("get_active_logic_version"))
		content_version = str(bundle_manager.call("get_active_content_version"))
	print(
		"STARTUP_LOGIC_READY logic=%s content=%s" % [
			logic_version,
			content_version,
		]
	)
	_publish_web_startup_state()
	await get_tree().process_frame
	await get_tree().process_frame
	_notify_loading_host()


func startup_candidate_id() -> String:
	return "core-fallback"


func _populate_runtime_state() -> void:
	var app_config := get_node_or_null("/root/AppConfig")
	var bundle_manager := get_node_or_null("/root/BundleManager")
	_runtime_label.text = (
		str(app_config.call("runtime_version_label")) if app_config else "Core candidate"
	)
	_content_label.text = (
		str(bundle_manager.call("get_status_summary")) if bundle_manager else "Logic candidate"
	)

	var marker_path := (
		str(app_config.call("content_marker_path"))
		if app_config
		else "res://content/bundles/bootstrap/content_marker.tres"
	)
	var marker := ResourceLoader.load(marker_path)
	if marker == null:
		_chapter_label.text = "第一章"
		_entry_label.text = "煤灰車站"
		return
	_chapter_label.text = str(marker.get_meta("chapter_title", "第一章"))
	_entry_label.text = str(marker.get_meta("entry_title", "煤灰車站"))


func _notify_loading_host() -> void:
	var host := get_tree().get_first_node_in_group("startup_loading_host")
	if host and host.has_method("complete_game_loading"):
		host.call("complete_game_loading")


func _publish_web_startup_state() -> void:
	if not OS.has_feature("web"):
		return
	var bundle_manager := get_node_or_null("/root/BundleManager")
	var logic_version := "candidate"
	var content_version := "candidate"
	if bundle_manager:
		logic_version = str(bundle_manager.call("get_active_logic_version"))
		content_version = str(bundle_manager.call("get_active_content_version"))
	var state := JSON.stringify({
		"ready": true,
		"candidate": startup_candidate_id(),
		"logic_version": logic_version,
		"content_version": content_version,
	})
	JavaScriptBridge.eval("window.__sootAndSinStartup = %s;" % state)


func _on_archive_pressed() -> void:
	_popup.message(
		"章節紀錄會在這裡保存已解鎖的小節與尚未完成的異常。",
		"章節檔案",
	)


func _on_settings_pressed() -> void:
	_popup.open_popup({
		"title": "離開目前畫面？",
		"content": "尚未進入冒險，現在返回不會失去任何物品。",
		"confirm_text": "留在此處",
		"cancel_text": "返回",
		"show_cancel": true,
		"close_on_backdrop": true,
	})


func _on_silver_pressed() -> void:
	_popup.message("銀幣會保留在角色死亡之後，並由所有章節共用。", "銀幣")


func _on_enter_pressed() -> void:
	_enter_button.disabled = true
	_popup.show_loading("enter-section", "正在展開煤灰車站的紀錄……", true)
	await get_tree().create_timer(0.72).timeout
	_popup.hide_loading("enter-section")
	_enter_button.disabled = false
	_popup.open_popup({
		"title": "第一節 · 煤灰車站",
		"content": "冒險事件將在下一階段接入；目前已完成主畫面與 Popup 流程。",
		"confirm_text": "確認",
		"show_cancel": false,
	})
