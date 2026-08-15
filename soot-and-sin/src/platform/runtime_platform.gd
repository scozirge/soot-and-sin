class_name RuntimePlatform
extends RefCounted


static func content_manifest_url() -> String:
	if OS.has_feature("web"):
		var value: Variant = JavaScriptBridge.eval(
			"new URL('%s', window.location.href).href" % AppConfig.WEB_MANIFEST_RELATIVE_URL,
			true
		)
		return str(value)

	return OS.get_environment(AppConfig.DESKTOP_MANIFEST_ENVIRONMENT_KEY).strip_edges()
