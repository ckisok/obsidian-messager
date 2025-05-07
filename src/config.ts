import { App, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import Helper, { AppendPluginSettings } from "./helper";
import Lang from './lang';
import AppendPlugin from './main';
import Note from './note';

export class AppendSettingTab extends PluginSettingTab {
	helper: Helper;
	lang: Lang;
	plugin: AppendPlugin;
	app: App;
    fixedTitleContainer: HTMLElement; // container for fixed title input
	
	constructor(app: App, plugin: AppendPlugin) {
		super(app, plugin);

		this.plugin = plugin;
		this.app    = app;
		this.helper = new Helper;
		this.lang   = new Lang;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// apiKey input
		new Setting(containerEl)
		.setName(this.lang.NAME_APIKEY)
		.setDesc(this.lang.DESC_APIKEY)
		.addText(text => text
			.setPlaceholder(this.lang.PH_APIKEY)
			.setValue(this.plugin.settings.apikey ?? "")
			.onChange(async (value) => {
				this.plugin.settings.apikey = value;
				await this.plugin.saveSettings();
			})
		);

		// saved folder dropdown
		const allFolders = this.helper.getAllFolder(this.app)
		new Setting(containerEl)
		.setName(this.lang.NAME_SAVEDIR)
		.setDesc(this.lang.DESC_SAVEDIR)
		.addDropdown(dropdown => {
			for (const k in allFolders) {
				const f = allFolders[k];
				dropdown.addOption(f, f)
			}
			if (this.plugin.settings.savedFolder.length < 1) {
				dropdown.setValue("/");
			} else {
				dropdown.setValue(this.plugin.settings.savedFolder);
			}
			dropdown.onChange(async (value) => {
				this.plugin.settings.savedFolder = value;
				await this.plugin.saveSettings();
			});
		});

		// filename dropdown 
		new Setting(containerEl)
		.setName(this.lang.NAME_FILENAME)
		.setDesc(this.lang.DESC_FILENAME)
		.addDropdown(dropdown => {
			dropdown.addOption("yyyy-mm-dd", "yyyy-mm-dd");
			dropdown.addOption("mm-dd", "mm-dd");
			dropdown.addOption(this.lang.FILENAME_RULE_CONTENT, this.lang.FILENAME_RULE_CONTENT);
			dropdown.addOption("fixed", this.lang.TITLE_FIXED);

			if (this.plugin.settings.filenameRule.length < 1) {
				dropdown.setValue("mm-dd");
			} else {
				dropdown.setValue(this.plugin.settings.filenameRule);
			}
			dropdown.onChange(async (value) => {
                this.plugin.settings.filenameRule = value;
                if (value == "fixed") {
                    this.inputForFixedTitle()
                } else {
                    this.fixedTitleContainer.empty()
                    this.plugin.settings.fixedTitle = "";
                    await this.plugin.saveSettings();
                }
			});

            this.fixedTitleContainer = containerEl.createDiv();
            if (this.plugin.settings.filenameRule == "fixed") {
                this.inputForFixedTitle() // show saved value
            }
		});


		// conflict filename rule 
		new Setting(containerEl)
		.setName(this.lang.NAME_CONFLICTFILE)
		.setDesc(this.lang.DESC_CONFLICTFILE)
		.addDropdown(dropdown => {
			dropdown.addOption("new", this.lang.CONFLICTFILE_NEW);
			dropdown.addOption("append", this.lang.CONFLICTFILE_APPEND);

			if (this.plugin.settings.conflictFileRule.length < 1) {
				dropdown.setValue("append");
			} else {
				dropdown.setValue(this.plugin.settings.conflictFileRule);
			}

			dropdown.onChange(async (value) => {
				this.plugin.settings.conflictFileRule = value;
				await this.plugin.saveSettings();
			});
		});

		// add prefix
		new Setting(containerEl)
		.setName(this.lang.PREFIX_TITLE)
		.setDesc(this.lang.PREFIX_DESC)
		.addText(text => text
			.setPlaceholder(this.lang.PREFIX_TITLE)
			.setValue(this.plugin.settings.contentPrefix ?? "")
			.onChange(async (value) => {
				this.plugin.settings.contentPrefix = value;
				await this.plugin.saveSettings();
			})
		);

		// add suffix
		new Setting(containerEl)
		.setName(this.lang.SUFFIX_TITLE)
		.setDesc(this.lang.SUFFIX_DESC)
		.addText(text => text
			.setPlaceholder(this.lang.SUFFIX_TITLE)
			.setValue(this.plugin.settings.contentSuffix ?? "")
			.onChange(async (value) => {
				this.plugin.settings.contentSuffix = value;
				await this.plugin.saveSettings();
			})
		);
		
        // insert new message position: insert_before/insert_after
		new Setting(containerEl)
		.setName(this.lang.INSERT_POSITION)
		.setDesc(this.lang.INSERT_POSITION_DESC)
		.addDropdown(dropdown => {
			dropdown.addOption("beginning", this.lang.INSERT_POSITION_BEGIN);
			dropdown.addOption("ending", this.lang.INSERT_POSITION_END);

			if (this.plugin.settings.insertPosition == null) {
				dropdown.setValue("ending");
			} else {
				dropdown.setValue(this.plugin.settings.insertPosition);
			}

			dropdown.onChange(async (value) => {
				this.plugin.settings.insertPosition = value;
				await this.plugin.saveSettings();
			});
		});

		// refresh interval
		new Setting(containerEl)
		.setName(this.lang.NAME_REFRESHINTERVAL)
		.setDesc(this.lang.DESC_REFRESHINTERVAL)
		.addDropdown(dropdown => {
			dropdown.addOption("10", "10");
			dropdown.addOption("30", "30");
			dropdown.addOption("60", "60");
			dropdown.addOption("180", "180");
			dropdown.addOption("300", "300");

			if (this.plugin.settings.refreshInterval.length < 1) {
				dropdown.setValue("30");
			} else {
				dropdown.setValue(this.plugin.settings.refreshInterval);
			}

			dropdown.onChange(async (value) => {
				this.plugin.settings.refreshInterval = value;
				await this.plugin.saveSettings();
			});
		});

        // choose template
        const templates = this.helper.getAllTemplates(this.app)
		new Setting(containerEl)
		.setName(this.lang.CHOOSE_TEMPLATE)
		.setDesc(this.lang.CHOOSE_TEMPLATE_DESC)
		.addDropdown(dropdown => {
			dropdown.addOption("", "")
            for (const k in templates) {
                let option = templates[k]
			    dropdown.addOption(option.name, option.name)
            }
			dropdown.setValue(this.plugin.settings.templateName);

			dropdown.onChange(async (value) => {
				this.plugin.settings.templateName = value
				await this.plugin.saveSettings();
			});
		});

		// verify apiKey button
		new Setting(containerEl)
		.setName(this.lang.NAME_VERIFYBTN)
		.setDesc(this.lang.DESC_VERIFYBTN)
		.addButton(button => {
			button.setButtonText(this.lang.NAME_VERIFYBTN)
			.setCta() 
			.onClick(async () => {
				await this.plugin.saveSettings();
				try {
					let note = new Note(this.app, this.plugin);
					await note.getAndSaveMessage(true);
				} catch (err) {
					new Notice(this.lang.APIKEY_VERIFYERR+err);
					return;
				}
			});
		});
        // desc 
        const p = containerEl.createEl('p');
        p.appendText(this.lang.MORE_DESC);
        p.createEl('a', {
            text: 'Here',
            href: 'https://wechatobsidian.com/',
        });
        p.style.fontSize = '12px';  
        p.style.color = '#888888';  
        containerEl.createEl('hr');

        // suffix prefix usage
        const usage = containerEl.createEl('pre');
        usage.appendText(this.lang.SUFFIX_PREFIX_USAGE);
        usage.style.fontSize = '12px';  
        usage.style.color = '#888888';  


        containerEl.createEl('hr');

        // latest update
        const updDesc = containerEl.createEl('pre');
        updDesc.appendText(this.lang.LATEST_UPDATE.replace(/\\n/g, '\n'));
        updDesc.style.fontSize = '12px';  
        updDesc.style.color = '#888888';  
    }

    // add an input setting for set fixed title 
    inputForFixedTitle(): void {
        this.fixedTitleContainer.empty()
		// fixed title input
		new Setting(this.fixedTitleContainer)
		.setName(this.lang.SET_TITLE_FIXED)
		.setDesc(this.lang.TITLE_FIXED_DESC)
		.addText(text => text
			.setPlaceholder(this.lang.SET_TITLE_FIXED)
			.setValue(this.plugin.settings.fixedTitle ?? "")
			.onChange(async (value) => {
                if (value.indexOf(".") >= 0) {
                    new Notice(this.lang.TITLE_FIXED_ERR + "can't include . in filename");
                    return
                }
				this.plugin.settings.fixedTitle = value;
				await this.plugin.saveSettings();
			})
		);
    }
}
