import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "../../context/AppContext";
import { themeList } from "../../themes";
import { AVAILABLE_LANGUAGES } from "../../i18n";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ── Reusable sub-components ─────────────────────────────────────────── */

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
                <Label className="font-medium text-sm">{label}</Label>
                {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
            </div>
            {children}
        </div>
    );
}

function SettingInput({ label, desc, ...inputProps }: { label: string; desc?: string } & React.ComponentProps<typeof Input>) {
    return (
        <div className="space-y-1">
            <Label className="font-medium text-sm">{label}</Label>
            {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
            <Input className="text-sm" {...inputProps} />
        </div>
    );
}

function SettingSelect({ label, desc, value, onValueChange, children }: {
    label: string; desc?: string; value: string; onValueChange: (v: string) => void; children: React.ReactNode
}) {
    return (
        <div className="space-y-1">
            <Label className="font-medium text-sm">{label}</Label>
            {desc && <p className="text-xs text-muted-foreground pb-1">{desc}</p>}
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {children}
                </SelectContent>
            </Select>
        </div>
    );
}

function SettingCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
        />
    );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export default function SettingsDialog() {
    const { t, i18n } = useTranslation();
    const { showSettingsDialog, setShowSettingsDialog, appSettings, updateAppSettings, uiConfig, updateUiConfig } = useApp();
    const [activeTab, setActiveTab] = useState("general");
    const [systemFonts, setSystemFonts] = useState<string[]>([]);

    useEffect(() => {
        invoke<string[]>("get_system_fonts")
            .then(fonts => setSystemFonts(fonts))
            .catch(console.error);
    }, []);

    const tabs = [
        { id: "general", label: t("settings.general", "General"), icon: "settings" },
        { id: "appearance", label: t("settings.appearance", "Appearance"), icon: "palette" },
        { id: "proxy", label: t("settings.proxy", "Proxy"), icon: "router" },
        { id: "search", label: t("settings.search", "Search"), icon: "search" },
        { id: "translation", label: t("settings.translation", "Translation"), icon: "translate" },
        { id: "security", label: t("settings.security", "Security"), icon: "security" },
        { id: "terminal", label: t("settings.terminal", "Terminal Core"), icon: "terminal" },
        { id: "interaction", label: t("settings.interaction", "Interaction"), icon: "mouse" },
    ];

    return (
        <Dialog open={showSettingsDialog} onOpenChange={(v) => !v && setShowSettingsDialog(false)}>
            <DialogContent
                className="w-full max-w-4xl sm:max-w-4xl h-[80vh] p-0 gap-0 flex flex-col sm:flex-row overflow-hidden"
                showCloseButton={false}
                style={{ fontFamily: appSettings.appearance.font_family }}
            >
                {/* Sidebar */}
                <div className="w-full sm:w-64 shrink-0 flex flex-col border-r bg-background overflow-y-auto">
                    <div className="p-6 border-b shrink-0 flex items-center gap-3">
                        <span className="material-icons text-2xl text-primary">settings</span>
                        <h2 className="text-xl font-semibold">{t("settings.title", "Settings")}</h2>
                    </div>
                    <div className="flex-1 py-3 px-3 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeTab === tab.id ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}
                            >
                                <span className={`material-icons text-[18px] ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-6 border-b shrink-0 flex items-center justify-between">
                        <h3 className="text-2xl font-semibold">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setShowSettingsDialog(false)}
                        >
                            <span className="material-icons text-xl">close</span>
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        <div className="max-w-2xl text-base space-y-6">

                            {/* ── General Tab ──────────────────────────────────────── */}
                            {activeTab === "general" && (
                                <div className="space-y-4">
                                    <SettingRow
                                        label={t("settings.startupRestore", "Restore previous session on startup")}
                                        desc={t("settings.startupRestoreDesc", "Automatically reconnect to tabs that were open when you last closed the app.")}
                                    >
                                        <SettingCheckbox checked={appSettings.general.startup_restore} onChange={(v) => updateAppSettings({ general: { ...appSettings.general, startup_restore: v } })} />
                                    </SettingRow>

                                    <SettingInput
                                        label={t("settings.defaultLocalShell", "Default Local Shell")}
                                        desc={t("settings.defaultLocalShellDesc", "The shell path to use when opening a local terminal.")}
                                        value={appSettings.general.default_local_shell}
                                        onChange={(e) => updateAppSettings({ general: { ...appSettings.general, default_local_shell: e.target.value } })}
                                    />

                                    <SettingRow
                                        label={t("settings.minimizeToTray", "Minimize to tray on close")}
                                        desc={t("settings.minimizeToTrayDesc", "Keep the application running in the background when the window is closed.")}
                                    >
                                        <SettingCheckbox checked={appSettings.general.minimize_to_tray} onChange={(v) => updateAppSettings({ general: { ...appSettings.general, minimize_to_tray: v } })} />
                                    </SettingRow>
                                </div>
                            )}

                            {/* ── Appearance Tab ───────────────────────────────────── */}
                            {activeTab === "appearance" && (
                                <div className="space-y-5">
                                    <SettingSelect
                                        label={t("settings.theme", "Theme")}
                                        desc={t("settings.themeDesc", "Select the color theme for the terminal and application.")}
                                        value={appSettings.appearance.theme || "github-dark"}
                                        onValueChange={(v) => updateAppSettings({ appearance: { ...appSettings.appearance, theme: v } })}
                                    >
                                        {themeList.map((tm) => (
                                            <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                                        ))}
                                    </SettingSelect>

                                    <SettingSelect
                                        label={t("settings.language", "Language")}
                                        desc={t("settings.languageDesc", "Select the display language for the application interface.")}
                                        value={uiConfig.language || "en"}
                                        onValueChange={(lng) => { i18n.changeLanguage(lng); updateUiConfig({ language: lng }); }}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lng => (
                                            <SelectItem key={lng.id} value={lng.id}>{lng.name}</SelectItem>
                                        ))}
                                    </SettingSelect>

                                    {/* Font Family */}
                                    <div className="space-y-2">
                                        <Label className="font-medium text-sm">{t("settings.fontFamily", "Font Family")}</Label>
                                        <p className="text-xs text-muted-foreground">{t("settings.fontFamilyDesc", "The font family used in the terminal and app UI. Topmost font has highest priority.")}</p>
                                        <div className="space-y-2">
                                            {appSettings.appearance.font_family.split(",").map(f => f.trim()).map((font, idx, arr) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="text-xs w-20 shrink-0 text-muted-foreground">{idx === 0 ? t("settings.fontPrimary", "Primary") : `${t("settings.fontFallback", "Fallback")} ${idx}`}</span>
                                                    <select
                                                        className="flex-1 h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs focus:outline-none"
                                                        value={systemFonts.includes(font) ? font : ""}
                                                        onChange={(e) => {
                                                            const newFonts = [...arr];
                                                            newFonts[idx] = e.target.value;
                                                            updateAppSettings({ appearance: { ...appSettings.appearance, font_family: newFonts.filter(Boolean).join(", ") } });
                                                        }}
                                                    >
                                                        {!systemFonts.includes(font) && <option value={font}>{font} (Custom/Missing)</option>}
                                                        {systemFonts.map(f => <option key={f} value={f}>{f}</option>)}
                                                    </select>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        title={t("common.remove", "Remove")}
                                                        onClick={() => {
                                                            const newFonts = arr.filter((_, i) => i !== idx);
                                                            if (newFonts.length === 0) newFonts.push("Consolas");
                                                            updateAppSettings({ appearance: { ...appSettings.appearance, font_family: newFonts.join(", ") } });
                                                        }}
                                                    >
                                                        <span className="material-icons text-[16px]">close</span>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            className="text-primary"
                                            onClick={() => {
                                                const newFonts = [...appSettings.appearance.font_family.split(",").map(f => f.trim()), systemFonts[0] || "Arial"];
                                                updateAppSettings({ appearance: { ...appSettings.appearance, font_family: newFonts.join(", ") } });
                                            }}
                                        >
                                            <span className="material-icons text-[14px]">add</span> {t("settings.addFallbackFont", "Add Fallback")}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <SettingInput
                                            label={t("settings.fontSize", "Font Size (px)")}
                                            type="number"
                                            min={8} max={72}
                                            value={appSettings.appearance.font_size}
                                            onChange={(e) => updateAppSettings({ appearance: { ...appSettings.appearance, font_size: parseInt(e.target.value) || 14 } })}
                                        />
                                        <SettingSelect
                                            label={t("settings.cursorStyle", "Cursor Style")}
                                            value={appSettings.appearance.cursor_style}
                                            onValueChange={(v) => updateAppSettings({ appearance: { ...appSettings.appearance, cursor_style: v } })}
                                        >
                                            <SelectItem value="block">{t("settings.cursorBlock", "Block")}</SelectItem>
                                            <SelectItem value="underline">{t("settings.cursorUnderline", "Underline")}</SelectItem>
                                            <SelectItem value="bar">{t("settings.cursorBar", "Bar")}</SelectItem>
                                        </SettingSelect>
                                    </div>

                                    <SettingRow label={t("settings.cursorBlink", "Cursor Blink")}>
                                        <SettingCheckbox checked={appSettings.appearance.cursor_blink} onChange={(v) => updateAppSettings({ appearance: { ...appSettings.appearance, cursor_blink: v } })} />
                                    </SettingRow>

                                    <SettingRow
                                        label={t("settings.fontLigatures", "Enable Font Ligatures")}
                                        desc={t("settings.fontLigaturesDesc", "Combine multiple characters into a single typographical glyph.")}
                                    >
                                        <SettingCheckbox checked={appSettings.appearance.ligatures} onChange={(v) => updateAppSettings({ appearance: { ...appSettings.appearance, ligatures: v } })} />
                                    </SettingRow>
                                </div>
                            )}

                            {/* ── Terminal Tab ─────────────────────────────────────── */}
                            {activeTab === "terminal" && (
                                <div className="space-y-4">
                                    <SettingInput
                                        label={t("settings.scrollbackLines", "Scrollback Buffer (lines)")}
                                        desc={t("settings.scrollbackLinesDesc", "Number of lines kept in memory for scrolling up.")}
                                        type="number" min={100} max={100000} step={100}
                                        value={appSettings.terminal.scrollback_lines}
                                        onChange={(e) => updateAppSettings({ terminal: { ...appSettings.terminal, scrollback_lines: parseInt(e.target.value) || 5000 } })}
                                    />

                                    <SettingInput
                                        label={t("settings.keepAliveInterval", "Keep-Alive Interval (seconds)")}
                                        desc={t("settings.keepAliveIntervalDesc", "Send SSH keep-alive packets every X seconds. 0 to disable.")}
                                        type="number" min={0} max={600} step={5}
                                        value={appSettings.terminal.keep_alive_interval}
                                        onChange={(e) => updateAppSettings({ terminal: { ...appSettings.terminal, keep_alive_interval: parseInt(e.target.value) || 0 } })}
                                    />

                                    <SettingRow
                                        label={t("settings.hardwareAcceleration", "Hardware Acceleration")}
                                        desc={t("settings.hardwareAccelerationDesc", "Use GPU for terminal rendering (WebGL/Canvas). Requires restart.")}
                                    >
                                        <SettingCheckbox checked={appSettings.terminal.hardware_acceleration} onChange={(v) => updateAppSettings({ terminal: { ...appSettings.terminal, hardware_acceleration: v } })} />
                                    </SettingRow>
                                </div>
                            )}

                            {/* ── Interaction Tab ──────────────────────────────────── */}
                            {activeTab === "interaction" && (
                                <div className="space-y-4">
                                    <SettingRow
                                        label={t("settings.copyOnSelect", "Copy on Select")}
                                        desc={t("settings.copyOnSelectDesc", "Automatically copy selected text to the clipboard.")}
                                    >
                                        <SettingCheckbox checked={appSettings.interaction.copy_on_select} onChange={(v) => updateAppSettings({ interaction: { ...appSettings.interaction, copy_on_select: v } })} />
                                    </SettingRow>

                                    <SettingRow
                                        label={t("settings.rightClickPaste", "Right-click Paste")}
                                        desc={t("settings.rightClickPasteDesc", "Paste clipboard content on right-click instead of opening context menu.")}
                                    >
                                        <SettingCheckbox checked={appSettings.interaction.right_click_paste} onChange={(v) => updateAppSettings({ interaction: { ...appSettings.interaction, right_click_paste: v } })} />
                                    </SettingRow>

                                    <SettingInput
                                        label={t("settings.wordSeparators", "Word Separators")}
                                        desc={t("settings.wordSeparatorsDesc", "Characters that separate words for double-click selection.")}
                                        value={appSettings.interaction.word_separators}
                                        onChange={(e) => updateAppSettings({ interaction: { ...appSettings.interaction, word_separators: e.target.value } })}
                                    />

                                    <SettingSelect
                                        label={t("settings.defaultEncoding", "Default Encoding")}
                                        value={appSettings.interaction.default_encoding}
                                        onValueChange={(v) => updateAppSettings({ interaction: { ...appSettings.interaction, default_encoding: v } })}
                                    >
                                        <SelectItem value="UTF-8">UTF-8</SelectItem>
                                        <SelectItem value="GBK">GBK</SelectItem>
                                    </SettingSelect>
                                </div>
                            )}

                            {/* ── Proxy Tab ────────────────────────────────────────── */}
                            {activeTab === "proxy" && (
                                <div className="space-y-4">
                                    <SettingRow
                                        label={t("settings.enableProxy", "Enable Proxy")}
                                        desc={t("settings.enableProxyDesc", "Route SSH connections through a proxy server.")}
                                    >
                                        <SettingCheckbox checked={appSettings.proxy.enabled} onChange={(v) => updateAppSettings({ proxy: { ...appSettings.proxy, enabled: v } })} />
                                    </SettingRow>

                                    <div className={`space-y-4 ${!appSettings.proxy.enabled ? "opacity-50 pointer-events-none" : ""}`}>
                                        <SettingSelect
                                            label={t("settings.proxyProtocol", "Protocol")}
                                            value={appSettings.proxy.protocol}
                                            onValueChange={(v) => updateAppSettings({ proxy: { ...appSettings.proxy, protocol: v } })}
                                        >
                                            <SelectItem value="socks5">SOCKS5</SelectItem>
                                            <SelectItem value="http">HTTP</SelectItem>
                                        </SettingSelect>

                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <SettingInput
                                                    label={t("settings.proxyHost", "Host")}
                                                    placeholder="127.0.0.1"
                                                    value={appSettings.proxy.host}
                                                    onChange={(e) => updateAppSettings({ proxy: { ...appSettings.proxy, host: e.target.value } })}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <SettingInput
                                                    label={t("settings.proxyPort", "Port")}
                                                    type="number" min={1} max={65535}
                                                    value={appSettings.proxy.port || ""}
                                                    onChange={(e) => updateAppSettings({ proxy: { ...appSettings.proxy, port: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Search Tab ───────────────────────────────────────── */}
                            {activeTab === "search" && (
                                <div className="space-y-6">
                                    <SettingSelect
                                        label={t("settings.defaultSearchEngine", "Default Search Engine")}
                                        desc={t("settings.defaultSearchEngineDesc", "The primary engine used when double-clicking or right-clicking to search.")}
                                        value={appSettings.search.default_engine}
                                        onValueChange={(v) => updateAppSettings({ search: { ...appSettings.search, default_engine: v } })}
                                    >
                                        {appSettings.search.custom_engines.map((engine, idx) => (
                                            <SelectItem key={idx} value={engine.name}>{engine.name}</SelectItem>
                                        ))}
                                    </SettingSelect>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-medium text-sm">{t("settings.customEngines", "Search Engines")}</Label>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                className="text-primary"
                                                onClick={() => {
                                                    const newEngines = [...appSettings.search.custom_engines, { name: "New Engine", url_template: "https://example.com/search?q=%s" }];
                                                    updateAppSettings({ search: { ...appSettings.search, custom_engines: newEngines } });
                                                }}
                                            >
                                                <span className="material-icons text-[14px]">add</span> {t("common.add", "Add")}
                                            </Button>
                                        </div>

                                        <div className="border rounded-md overflow-hidden">
                                            {appSettings.search.custom_engines.map((engine, i) => (
                                                <div key={i} className="flex items-center gap-2 p-2 border-b last:border-0 hover:bg-accent transition-colors">
                                                    <Input
                                                        placeholder="Name"
                                                        className="w-1/3 text-sm"
                                                        value={engine.name}
                                                        onChange={(e) => {
                                                            const newEngines = [...appSettings.search.custom_engines];
                                                            newEngines[i] = { ...newEngines[i], name: e.target.value };
                                                            updateAppSettings({ search: { ...appSettings.search, custom_engines: newEngines } });
                                                        }}
                                                    />
                                                    <Input
                                                        placeholder="URL Template (e.g. https://google.com/search?q=%s)"
                                                        className="flex-1 text-sm"
                                                        value={engine.url_template}
                                                        onChange={(e) => {
                                                            const newEngines = [...appSettings.search.custom_engines];
                                                            newEngines[i] = { ...newEngines[i], url_template: e.target.value };
                                                            updateAppSettings({ search: { ...appSettings.search, custom_engines: newEngines } });
                                                        }}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        title={t("common.delete", "Delete")}
                                                        onClick={() => {
                                                            const newEngines = appSettings.search.custom_engines.filter((_, idx) => idx !== i);
                                                            const newDefault = (appSettings.search.default_engine === engine.name) ? (newEngines[0]?.name || "") : appSettings.search.default_engine;
                                                            updateAppSettings({ search: { default_engine: newDefault, custom_engines: newEngines } });
                                                        }}
                                                    >
                                                        <span className="material-icons text-[16px]">delete</span>
                                                    </Button>
                                                </div>
                                            ))}
                                            {appSettings.search.custom_engines.length === 0 && (
                                                <div className="text-center py-6 text-xs text-muted-foreground">
                                                    {t("settings.noCustomEngines", "No search engines available.")}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs mt-1 text-muted-foreground">
                                            {t("settings.customEnginesDesc", "Use %s to represent the searched text in the URL template.")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Translation Tab ──────────────────────────────────── */}
                            {activeTab === "translation" && (
                                <div className="space-y-4">
                                    <SettingSelect
                                        label={t("settings.translationProvider", "Translation Provider")}
                                        desc={t("settings.translationProviderDesc", "Select the API provider for translating terminal output.")}
                                        value={appSettings.translation.provider}
                                        onValueChange={(v) => updateAppSettings({ translation: { ...appSettings.translation, provider: v } })}
                                    >
                                        <SelectItem value="">{t("settings.translationDisabled", "Disabled")}</SelectItem>
                                        <SelectItem value="openai">OpenAI</SelectItem>
                                        <SelectItem value="deepl">DeepL</SelectItem>
                                    </SettingSelect>

                                    {appSettings.translation.provider !== "" && (
                                        <SettingInput
                                            label={t("settings.translationApiKey", "API Key")}
                                            desc={t("settings.translationApiKeyDesc", "Enter the API key for your chosen translation provider.")}
                                            type="password"
                                            placeholder="sk-..."
                                            value={appSettings.translation.api_key}
                                            onChange={(e) => updateAppSettings({ translation: { ...appSettings.translation, api_key: e.target.value } })}
                                        />
                                    )}
                                </div>
                            )}

                            {/* ── Security Tab ─────────────────────────────────────── */}
                            {activeTab === "security" && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">{t("settings.credentialStorage", "Credential Storage")}</h4>

                                        <SettingRow
                                            label={t("settings.useOsKeyring", "Use OS Keyring")}
                                            desc={t("settings.useOsKeyringDesc", "Securely store SSH passwords and keys in your system's native keychain.")}
                                        >
                                            <SettingCheckbox checked={appSettings.security.use_os_keyring} onChange={(v) => updateAppSettings({ security: { ...appSettings.security, use_os_keyring: v } })} />
                                        </SettingRow>

                                        <SettingRow
                                            label={t("settings.requireMasterPassword", "Require Master Password")}
                                            desc={t("settings.requireMasterPasswordDesc", "Require a master password to encrypt your session database.")}
                                        >
                                            <SettingCheckbox checked={appSettings.security.require_master_password} onChange={(v) => updateAppSettings({ security: { ...appSettings.security, require_master_password: v } })} />
                                        </SettingRow>
                                    </div>

                                    <div className="border-t pt-4 space-y-4">
                                        <h4 className="font-semibold text-sm">{t("settings.sessionSecurity", "Session Security")}</h4>

                                        <SettingRow
                                            label={t("settings.idleLockMinutes", "Session Lock Interval")}
                                            desc={t("settings.idleLockMinutesDesc", "Lock the application after a specified duration of inactivity (0 to disable).")}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number" min={0} max={1440}
                                                    className="w-20 text-sm"
                                                    value={appSettings.security.idle_lock_minutes}
                                                    onChange={(e) => updateAppSettings({ security: { ...appSettings.security, idle_lock_minutes: parseInt(e.target.value) || 0 } })}
                                                />
                                                <span className="text-sm text-muted-foreground">{t("common.minutes", "mins")}</span>
                                            </div>
                                        </SettingRow>

                                        <SettingSelect
                                            label={t("settings.hostKeyPolicy", "Host Key Policy")}
                                            desc={t("settings.hostKeyPolicyDesc", "How the application handles unrecognized SSH host keys.")}
                                            value={appSettings.security.host_key_policy}
                                            onValueChange={(v) => updateAppSettings({ security: { ...appSettings.security, host_key_policy: v } })}
                                        >
                                            <SelectItem value="strict">{t("settings.hostKeyStrict", "Strict (Reject unknown hosts)")}</SelectItem>
                                            <SelectItem value="prompt">{t("settings.hostKeyPrompt", "Prompt (Ask user for confirmation)")}</SelectItem>
                                            <SelectItem value="accept">{t("settings.hostKeyAccept", "Accept (Automatically add new hosts)")}</SelectItem>
                                        </SettingSelect>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
