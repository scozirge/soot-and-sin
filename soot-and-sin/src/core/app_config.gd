extends Node

const APP_VERSION := "0.1.0-dev"
const CORE_API_VERSION := 1
const BUNDLE_MANIFEST_SCHEMA_VERSION := 1
const NETWORK_PROTOCOL_VERSION := 1
const ENGINE_MAJOR_MINOR := "4.7"
const UPDATE_CHANNEL := "development"

const DEFAULT_ENTRY_SCENE := "res://src/shell/main_shell.tscn"

const BUNDLE_DIRECTORY := "user://bundles"
const BUNDLE_STAGING_DIRECTORY := "user://bundles/staging"
const ACTIVE_MANIFEST_PATH := "user://bundles/active_manifest.json"
const PREVIOUS_MANIFEST_PATH := "user://bundles/previous_manifest.json"
const BUILTIN_MANIFEST_PATH := "res://config/bundles/builtin_manifest.json"


func runtime_version_label() -> String:
	return "Core %s · API %d · Protocol %d" % [
		APP_VERSION,
		CORE_API_VERSION,
		NETWORK_PROTOCOL_VERSION,
	]
