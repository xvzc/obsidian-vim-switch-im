import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian"
import * as child from "child_process"

interface Settings {
	executablePath: string
	defaultInputMethod: string
	restorePrevious: boolean
}

const DEFAULT_SETTINGS: Settings = {
	executablePath: "/opt/homebrew/bin/im-select",
	defaultInputMethod: "com.apple.keylayout.ABC",
	restorePrevious: false,
}

export default class VimSelectInputMethod extends Plugin {
	settings: Settings
	private initialized: boolean = false
	private cmEditor: CodeMirror.Editor | null = null
	private previousInput: string | null = null

	async onload() {
		await this.loadSettings()

		// This adds a simple command that can be triggered anywhere

		// when open a file, to initialize current
		// editor type CodeMirror5 or CodeMirror6
		this.app.workspace.on("file-open", async (_file) => {
			if (!this.initialized) await this.initialize()

			if (this.cmEditor) {
				// check if not in insert mode(normal or visual mode), swith to normal at first
				// if (!this.cmEditor.state.vim.insertMode) {
				// 	this.switchToNormal()
				// }
				this.cmEditor.on("vim-mode-change", this.onVimModeChange)
			}
		})

		this.addSettingTab(new SampleSettingTab(this.app, this))

		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt)
		})

		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
		)
	}

	onVimModeChange = async (cm: any) => {
		if (cm.mode == "normal" || cm.mode == "visual") {
			if (this.settings.restorePrevious) {
				const proc = child.spawnSync(this.settings.executablePath, {
					encoding: "utf-8",
				})
				this.previousInput = proc.stdout
			}
			const cmd = `${this.settings.executablePath} ${this.settings.defaultInputMethod}`
			child.exec(cmd)
		} else {
			if (this.settings.restorePrevious) {
				const cmd = `${this.settings.executablePath} ${this.previousInput}`
				child.exec(cmd)
			}
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}

	async selectDefaultInputMethod() {}

	async initialize() {
		if (this.initialized) return

		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		this.cmEditor = (view as any).sourceMode?.cmEditor?.cm?.cm
		this.initialized = true
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: VimSelectInputMethod

	constructor(app: App, plugin: VimSelectInputMethod) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName("Executable path")
			.setDesc("The absolute path of the im-select executable")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.executablePath)
					.onChange(async (value) => {
						this.plugin.settings.executablePath = value
						await this.plugin.saveSettings()
					}),
			)
		new Setting(containerEl)
			.setName("Default IM")
			.setDesc("Set default im that will be used for Normal, Visual, etc")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.defaultInputMethod)
					.onChange(async (value) => {
						this.plugin.settings.defaultInputMethod = value
						await this.plugin.saveSettings()
					}),
			)
		new Setting(containerEl)
			.setName("Restore previous IM")
			.setDesc(
				"Set this to true to restore the previous IM when going back to Insert mode",
			)
			.addToggle((tgl) =>
				tgl
					.setValue(this.plugin.settings.restorePrevious)
					.onChange(async (value) => {
						this.plugin.settings.restorePrevious = value
						await this.plugin.saveSettings()
					}),
			)
	}
}
