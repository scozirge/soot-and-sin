@tool
extends Control

@export_enum("loading", "game") var variant := "game":
	set(value):
		variant = value
		queue_redraw()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(queue_redraw)
	queue_redraw()


func _draw() -> void:
	var area := size
	if area.x <= 0.0 or area.y <= 0.0:
		return

	var base := Color("070a09") if variant == "loading" else Color("090c0a")
	draw_rect(Rect2(Vector2.ZERO, area), base)

	# Cocos Mines 以全畫面背景承接遊戲層；這裡保留相同結構，
	# 改用煤灰、電報格線與黃銅測量環呈現本作世界觀。
	var grid_color := Color(0.50, 0.42, 0.27, 0.055 if variant == "loading" else 0.075)
	var grid_step := 80.0
	var x := fmod(area.x * 0.5, grid_step)
	while x < area.x:
		draw_line(Vector2(x, 0.0), Vector2(x, area.y), grid_color, 1.0)
		x += grid_step
	var y := fmod(area.y * 0.5, grid_step)
	while y < area.y:
		draw_line(Vector2(0.0, y), Vector2(area.x, y), grid_color, 1.0)
		y += grid_step

	var center := Vector2(area.x * (0.50 if variant == "loading" else 0.38), area.y * 0.48)
	var ring_color := Color(0.67, 0.52, 0.29, 0.075 if variant == "loading" else 0.095)
	for radius in [180.0, 270.0, 410.0, 580.0]:
		draw_arc(center, radius, 0.0, TAU, 128, ring_color, 1.0, true)

	var rng := RandomNumberGenerator.new()
	rng.seed = 18870117 if variant == "loading" else 18870402
	var soot_count := 180 if variant == "loading" else 120
	for index in soot_count:
		var point := Vector2(rng.randf_range(0.0, area.x), rng.randf_range(0.0, area.y))
		var radius := rng.randf_range(0.35, 2.2)
		var alpha := rng.randf_range(0.025, 0.11)
		draw_circle(point, radius, Color(0.62, 0.61, 0.52, alpha))

	var edge := Color(0.68, 0.52, 0.28, 0.34)
	draw_line(Vector2(38.0, 38.0), Vector2(178.0, 38.0), edge, 1.0)
	draw_line(Vector2(38.0, 38.0), Vector2(38.0, 112.0), edge, 1.0)
	draw_line(Vector2(area.x - 38.0, area.y - 38.0), Vector2(area.x - 178.0, area.y - 38.0), edge, 1.0)
	draw_line(Vector2(area.x - 38.0, area.y - 38.0), Vector2(area.x - 38.0, area.y - 112.0), edge, 1.0)
