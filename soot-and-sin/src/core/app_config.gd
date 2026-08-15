extends Node

const APP_VERSION := "0.1.0-dev"
const CORE_API_VERSION := 1
const LOGIC_CONTRACT_VERSION := 1
const BUNDLE_MANIFEST_SCHEMA_VERSION := 2
const SIGNED_MANIFEST_ENVELOPE_VERSION := 1
const NETWORK_PROTOCOL_VERSION := 1
const ENGINE_MAJOR_MINOR := "4.7"
const UPDATE_CHANNEL := "development"

const FALLBACK_ENTRY_SCENE := "res://src/shell/main_shell.tscn"
const DEFAULT_CONTENT_MARKER := "res://content/bundles/bootstrap/content_marker.tres"
const TRUSTED_UPDATE_PUBLIC_KEYS := {
	"development": "res://config/security/development_update.pub",
}

const BUNDLE_DIRECTORY := "user://bundles"
const BUNDLE_STAGING_DIRECTORY := "user://bundles/staging"
const ACTIVE_MANIFEST_PATH := "user://bundles/active_manifest.json"
const PREVIOUS_MANIFEST_PATH := "user://bundles/previous_manifest.json"
const BUILTIN_MANIFEST_PATH := "res://config/bundles/builtin_manifest.json"
const WEB_MANIFEST_RELATIVE_URL := "content/manifest.json"
const DESKTOP_MANIFEST_ENVIRONMENT_KEY := "SOOT_AND_SIN_CONTENT_MANIFEST_URL"
const HTTP_TIMEOUT_SECONDS := 20.0


func runtime_version_label() -> String:
	return "Core %s · API %d · Logic %d · Protocol %d" % [
		APP_VERSION,
		CORE_API_VERSION,
		LOGIC_CONTRACT_VERSION,
		NETWORK_PROTOCOL_VERSION,
	]


func content_marker_path() -> String:
	return DEFAULT_CONTENT_MARKER
