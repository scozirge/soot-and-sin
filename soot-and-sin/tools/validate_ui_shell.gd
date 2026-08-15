extends SceneTree


func _init() -> void:
	call_deferred("_run")


func _run() -> void:
	if (
		int(ProjectSettings.get_setting("display/window/size/viewport_width", 0)) != 1600
		or int(ProjectSettings.get_setting("display/window/size/viewport_height", 0)) != 900
	):
		_fail("UI design viewport must remain 1600x900.")
		return

	var packed := ResourceLoader.load("res://src/shell/main_shell.tscn") as PackedScene
	if packed == null:
		_fail("Main shell scene could not be loaded.")
		return
	var shell := packed.instantiate()
	root.add_child(shell)
	await process_frame

	var popup := shell.get_node_or_null("GameScreen/PopupUI") as SootPopupUI
	if popup == null:
		_fail("PopupUI is missing from the top UI layer.")
		return
	var popup_root := popup.get_node("%PopupRoot") as Control
	var cancel_button := popup.get_node("%CancelButton") as Button
	var loading_root := popup.get_node("%LoadingRoot") as Control

	popup.message("message-test", "message")
	if not popup_root.visible or cancel_button.visible:
		_fail("Message popup presentation is invalid.")
		return
	popup.close_popup()

	popup.confirm("confirm-test", "confirm")
	if not popup_root.visible or not cancel_button.visible:
		_fail("Confirm popup presentation is invalid.")
		return
	popup.close_popup()

	popup.show_loading("blocking", "loading-test", true)
	if not loading_root.visible:
		_fail("Loading overlay did not open.")
		return
	popup.hide_loading("blocking")
	if loading_root.visible:
		_fail("Loading overlay did not close.")
		return

	if "--preview-popup" in OS.get_cmdline_user_args():
		popup.open_popup({
			"title": "離開目前畫面？",
			"content": "尚未進入冒險，現在返回不會失去任何物品。",
			"confirm_text": "留在此處",
			"cancel_text": "返回",
			"show_cancel": true,
			"close_on_backdrop": true,
		})
		await create_timer(1.5).timeout

	print("UI shell validation passed at 1600x900.")
	quit()


func _fail(message: String) -> void:
	push_error(message)
	quit(1)
