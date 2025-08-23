import API from "../api.js";
import CONSTANTS from "../constants.js";
import { isAlt, isRealNumber, retrieveFirstImageFromJournalId, stripQueryStringAndHashFromPath } from "../lib/lib.js";
import Logger from "../lib/Logger.js";
import { PinCushionPixiHelpers } from "../pixi/pin-cushion-pixi-helpers.js";
import { registerSettings } from "../settings.js";
import { BackgroundlessControlIcon } from "./BackgroundlessControlIcon.js";
import { PinCushionHUD } from "./PinCushionHUD.js";

/**
 * A class for managing additional Map Pin functionality
 * @author Evan Clarke (errational#2007)
 */
export class PinCushion {
    constructor() {
        // Storage for requests sent over a socket, pending GM execution
        this._requests = {};
    }

    /* -------------------------------- Constants ------------------------------- */

    static get DIALOG() {
        const defaultPermission = game.settings.get(CONSTANTS.MODULE_ID, "defaultJournalPermission");
        let defaultPermissionName = "NONE";
        if (String(defaultPermission) === "0") {
            defaultPermissionName = "NONE";
        }
        if (String(defaultPermission) === "1") {
            defaultPermissionName = "LIMITED";
        }
        if (String(defaultPermission) === "2") {
            defaultPermissionName = "OBSERVER";
        }
        if (String(defaultPermission) === "3") {
            defaultPermissionName = "OWNER";
        }
        // none, perUser, specificFolder
        const defaultFolder = game.settings.get(CONSTANTS.MODULE_ID, "defaultJournalFolder");

        const specificFolder = game.settings.get(CONSTANTS.MODULE_ID, "specificFolder");
        let jurnalFolderAdress;
        if(game.release.generation < 13){
          jurnalFolderAdress = game.journal.directory.folders;
           }
        else{
          jurnalFolderAdress = game.journal.folders.contents;
        }
        const specificFolderObj =
            jurnalFolderAdress.find((f) => f.name === specificFolder || f.id === specificFolder) ??
            jurnalFolderAdress[Number(specificFolder)] ??
            undefined;
        const specificFolderName = specificFolderObj ? specificFolderObj.name : "";

        const folders = jurnalFolderAdress
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter((folder) => folder.displayed)
            .map((folder) => `<option value="${folder.id}">${folder.name}</option>`)
            .join("\n");

        return {
            content: `
            <div class="form-group">
              <label>
                <p class="notes">${Logger.i18n("pin-cushion.Name")}</p>
              </label>
              <input name="name" type="text"/>
              <label>
                <p class="notes">${Logger.i18n("pin-cushion.DefaultPermission")}</p>
              </label>
              <select id="cushion-permission" style="width: 100%;">
                <option value="0"
                  ${String(defaultPermission) === "0" ? "selected" : ""}>
                  ${Logger.i18n("PERMISSION.NONE")}${String(defaultPermission) === "0" ? " <i>(default)</i>" : ""}
                </option>
                <option value="1"
                  ${String(defaultPermission) === "1" ? "selected" : ""}>
                  ${Logger.i18n("PERMISSION.LIMITED")}${String(defaultPermission) === "1" ? " <i>(default)</i>" : ""}
                </option>
                <option value="2"
                  ${String(defaultPermission) === "2" ? "selected" : ""}>
                  ${Logger.i18n("PERMISSION.OBSERVER")}${String(defaultPermission) === "2" ? " <i>(default)</i>" : ""}
                </option>
                <option value="3"
                  ${String(defaultPermission) === "3" ? "selected" : ""}>
                  ${Logger.i18n("PERMISSION.OWNER")}${String(defaultPermission) === "3" ? " <i>(default)</i>" : ""}
                </option>
              </select>
              <label>
                <p class="notes">${Logger.i18n("pin-cushion.Folder")}</p>
              </label>
              <select id="cushion-folder" style="width: 100%;">
                <option
                  value="none"
                  ${defaultFolder === "none" ? "selected" : ""}>
                    ${Logger.i18n("pin-cushion.None")}
                </option>
                <option value="perUser" ${defaultFolder === "perUser" ? "selected" : ""}>
                  ${Logger.i18n("pin-cushion.PerUser")} <i>(${game.user.name})</i>
                </option>
                <option
                  value="specificFolder"
                  ${defaultFolder === "specificFolder" ? "selected" : ""}>
                    ${Logger.i18n("pin-cushion.PerSpecificFolder")} <i>(${specificFolderName})</i>
                </option>
                <option disabled>──${Logger.i18n("pin-cushion.ExistingFolders")}──</option>
                ${folders}
              </select>
            </div>
            </br>
            `,
            title: "Create a Map Pin",
        };
    }

    static get NOTESLAYER() {
        return "NotesLayer";
    }

    static get FONT_SIZE() {
        return 16;
    }

    static autoScaleNotes(canvas) {
        const enableAutoScaleNamePlatesNote = game.settings.get(CONSTANTS.MODULE_ID, "enableAutoScaleNamePlatesNote");
        if (enableAutoScaleNamePlatesNote) {
            if (canvas.notes) {
                for (let note of canvas.notes.placeables) {
                    note.tooltip.scale.set(
                        PinCushion._calculateAutoScale(canvas.scene.dimensions.size, canvas.stage.scale.x),
                    );
                }
            }
        }
    }

    static _calculateAutoScale(sceneDimensionSize, zoomStage) {
        // Taken from Easy Ruler Scale, a mod by Kandashi
        // https://github.com/kandashi/easy-ruler-scale
        const gs = sceneDimensionSize / 100;
        const zs = 1 / zoomStage;
        return Math.max(gs * zs, 0.8);
    }

    /**
     * Render a file-picker button linked to an <input> field
     * @param {object} options              Helper options
     * @param {string} [options.type]       The type of FilePicker instance to display
     * @param {string} [options.target]     The field name in the target data
     * @param {string} [options.customClass] The field name in the custom class
     * @return {Handlebars.SafeString|string}
     */
    static filePicker(type, target, customClass = "file-picker") {
        // const type = options.hash['type'];
        // const target = options.hash['target'];
        if (!target) {
            throw new Logger.error("You must define the name of the target field.");
        }
        // Do not display the button for users who do not have browse permission
        if (game.world && !game.user.can("FILES_BROWSE")) {
            return "";
        }
        // Construct the HTML
        const tooltip = game.i18n.localize("FILES.BrowseTooltip");
        return new Handlebars.SafeString(`
    <button type="button" name="${customClass}" class="${customClass}" data-type="${type}" data-target="${target}" title="${tooltip}" tabindex="-1">
        <i class="fas fa-file-import fa-fw"></i>
    </button>`);
    }

    /* --------------------------------- Methods -------------------------------- */

    /**
     * Creates and renders a dialog for name entry
     * @param {*} data
     * break callbacks out into separate methods
     */
    _createDialog(data) {
        new Dialog({
            title: PinCushion.DIALOG.title,
            content: PinCushion.DIALOG.content,
            buttons: {
                save: {
                    label: "Save",
                    icon: `<i class="fas fa-check"></i>`,
                    callback: (html) => {
                        return this.createNoteFromCanvas(html, data);
                    },
                },
                cancel: {
                    label: "Cancel",
                    icon: `<i class="fas fa-times"></i>`,
                    callback: (e) => {
                        // Maybe do something in the future
                    },
                },
            },
            default: "save",
        }).render(true);
    }

    /**
     * Creates a Note from the Pin Cushion dialog
     * @param {*} html
     * @param {*} data
     */
    async createNoteFromCanvas(html, eventData) {
        const input = html.find("input[name='name']");

        if (!input[0].value) {
            Logger.warn(Logger.i18n("pin-cushion.MissingPinName"), true);
            return;
        }
        // Permissions the Journal Entry will be created with
        const permission = {
            [game.userId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
            default: parseInt($("#cushion-permission").val()) ?? 0,
        };

        const defaultJournalPermission = game.settings.get(CONSTANTS.MODULE_ID, "defaultJournalPermission");
        if (
            isRealNumber(defaultJournalPermission) &&
            (!isRealNumber(permission.default) || permission.default === 0) &&
            defaultJournalPermission >= 0
        ) {
            permission.default = defaultJournalPermission;
        }

        // Get folder ID for Journal Entry
        let folder;
        const selectedFolder = $("#cushion-folder").val();
        if (selectedFolder === "none") {
            folder = undefined;
        } else if (selectedFolder === "perUser") {
            folder = PinCushion.getFolder(game.user.name, selectedFolder);
            if (!game.user.isGM && folder === undefined) {
                // Request folder creation when perUser is set and the entry is created by a user
                // Since only the ID is required, instantiating a Folder from the data is not necessary
                // folder = (await PinCushion.requestEvent({ action: "createFolder" }))?._id;
                // TODO for some reason this will give me a error
                // folder = (await pinCushionSocket.executeAsGM('requestEvent', { action: "createFolder" }))?._id;
            }
        } else if (selectedFolder === "specificFolder") {
            const settingSpecificFolder = game.settings.get(CONSTANTS.MODULE_ID, "specificFolder");
            folder = PinCushion.getFolder(game.user.name, selectedFolder, settingSpecificFolder);
        } else {
            folder = selectedFolder; // Folder is already given as ID
        }
        const entry = await JournalEntry.create({
            name: `${input[0].value}`,
            ownership: permission,
            ...(folder && { folder }),
        });

        if (!entry) {
            return;
        }

        // offsely add fields required by Foundry's drop handling
        const entryData = entry.toJSON();
        entryData.id = entry.id;
        entryData.uuid = "JournalEntry." + entry.id;
        entryData.type = "JournalEntry";

        if (canvas.activeLayer.name !== PinCushion.NOTESLAYER) {
            await canvas.notes.activate();
        }

        await canvas.activeLayer._onDropData(eventData, entryData);
    }

    /**
     * Gets the JournalEntry Folder ID to be used for JournalEntry creations, if any.
     *
     * @static
     * @param {string} name - The player name to check folders against, defaults to current user's name
     * @param {string} setting - The module setting set for journal default
     * @param {string} folderName - The explicit name of the folder
     * @returns {string|undefined} The folder's ID, or undefined if there is no target folder
     */
    static getFolder(name, setting, folderName) {
        name = name ?? game.user.name;
         let jurnalFolderAdress;
        if(game.release.generation < 13){
          jurnalFolderAdress = game.journal.directory.folders;
           }
        else{
          jurnalFolderAdress = game.journal.folders.contents;
        }
        switch (setting) {
            // No target folder set
            case "none":
                return undefined;
            // Target folder should match the user's name
            case "perUser":
                return jurnalFolderAdress.find((f) => f.name === name)?.id ?? undefined;
            case "specificFolder":
                return (
                    jurnalFolderAdress.find((f) => f.name === folderName || f.id === folderName)?.id ??
                    jurnalFolderAdress[Number(folderName)]?.id ??
                    undefined
                );
            default:
                return name;
        }
    }

    /**
     * Checks for missing Journal Entry folders and creates them
     *
     * @static
     * @private
     * @returns {void}
     */
    static async _createFolders() {
        // Collect missing folders
        const setting = game.settings.get(CONSTANTS.MODULE_ID, "defaultJournalFolder");
        const missingFolders = game.users
            .filter((u) => !u.isGM && PinCushion.getFolder(u.name, setting) === undefined)
            .map((user) => ({
                name: user.name,
                type: "JournalEntry",
                parent: null,
                sorting: "a",
            }));
        if (missingFolders.length) {
            // Ask for folder creation confirmation in a dialog
            const createFolders = await new Promise((resolve, reject) => {
                new Dialog({
                    title: Logger.i18n("pin-cushion.CreateMissingFoldersT"),
                    content: Logger.i18n("pin-cushion.CreateMissingFoldersC"),
                    buttons: {
                        yes: {
                            label: `<i class="fas fa-check"></i> ${Logger.i18n("Yes")}`,
                            callback: () => resolve(true),
                        },
                        no: {
                            label: `<i class="fas fa-times"></i> ${Logger.i18n("No")}`,
                            callback: () => reject(),
                        },
                    },
                    default: "yes",
                    close: () => reject(),
                }).render(true);
            }).catch((_) => {});
            // Create folders
            if (createFolders) await Folder.create(missingFolders);
        }
    }

    /**
     * Replaces icon selector in Notes Config form with filepicker
     * @param {*} app
     * @param {*} html
     * @param {*} noteData
     */
    static _replaceIconSelector(app, html, noteData, explicitImageValue) {
        // const currentIconSelector = stripQueryStringAndHashFromPath(
        // 	explicitImageValue ? explicitImageValue : noteData.document.texture.src
        // );

        const currentIconSelector = stripQueryStringAndHashFromPath(explicitImageValue);

        // you can see this only if you have the file browser permissions
        const hasPermissionsToUploadFile = game.user.can("FILES_BROWSE");
        if (hasPermissionsToUploadFile) {
            // 	const filePickerHtml = `
            // 		<img class="pin-cushion-journal-icon" src="${currentIconSelector}" />
            // 		<input
            // 			type="text"
            // 			name="icon"
            // 			title="Icon Path"
            // 			class="icon-path"
            // 			value="${currentIconSelector}"
            // 			placeholder="/icons/example.svg"
            // 			data-dtype="String">
            // 		</input>
            // 		${this.filePicker("image", `icon`, `file-picker`)}
            // `;

            // /*
            // <button type="button"
            // 	name="file-picker"
            // 	class="file-picker"
            // 	data-type="image"
            // 	data-target="icon"
            // 	title="Browse Files"
            // 	tabindex="-1">
            // 	<i class="fas fa-file-import fa-fw"></i>
            // </button>
            // */
            // /*
            // <div class="form-fields">
            //     <input type="text" name="icon.custom" value="moulinette/images/img/npccampaign01/Jeanna_Silverchain.Avatar.png">
            // 	<button type="button" class="file-picker" data-type="image" data-target="icon.custom" title="Browse Files" tabindex="-1">
            // 		<i class="fas fa-file-import fa-fw"></i>
            // 	</button>
            // </div>
            // */

            // 	// const iconSelector = html.find("select[name='icon.selected']");
            const $html = ensureJquery(html);
            const iconCustomSelector = $html.find("input[name='icon.custom']");
            if (iconCustomSelector?.length > 0) {
                iconCustomSelector.val(currentIconSelector);
                iconCustomSelector.on("change", function () {
                    const p = iconCustomSelector.parent().find(".pin-cushion-journal-icon");
                    const valueIconSelector = $html.find("select[name='icon.selected']")?.val();
                    if (valueIconSelector) {
                        p[0].src = valueIconSelector;
                    } else {
                        p[0].src = this.value;
                    }
                });
                // iconCustomSelector.replaceWith(filePickerHtml);
                // 	// Detect and activate file-picker buttons
                // 	//html.find("button.file-picker").on("click", app._activateFilePicker.bind(app));
                // 	html.find("button.file-picker").each((i, button) => (button.onclick = app._activateFilePicker.bind(app)));
                const iconSelector = $html.find("select[name='icon.selected']");
                // Need this...
                if (iconSelector?.val() === "icons/svg/book.svg" && currentIconSelector) {
                    iconSelector?.val("").change();
                }
                if (iconSelector?.length > 0) {
                    iconSelector.on("change", function () {
                        const p = iconCustomSelector.parent().find(".pin-cushion-journal-icon");
                        const valueIconSelector = $html.find("select[name='icon.selected']")?.val();
                        if (valueIconSelector) {
                            p[0].src = valueIconSelector;
                        } else {
                            p[0].src = currentIconSelector;
                        }
                    });
                    const valueIconSelector = $html.find("select[name='icon.selected']")?.val();
                    if (valueIconSelector) {
                        iconCustomSelector
                            .parent()
                            .prepend(`<img class="pin-cushion-journal-icon" src="${valueIconSelector}" />`);
                    } else {
                        // https://gitlab.com/tiwato/journal_icon_numbers/-/issues/33
                        iconCustomSelector.prop("disabled", false);
                        iconCustomSelector
                            .parent()
                            .prepend(`<img class="pin-cushion-journal-icon" src="${currentIconSelector}" />`);
                    }
                } else {
                    iconCustomSelector
                        .parent()
                        .prepend(`<img class="pin-cushion-journal-icon" src="${currentIconSelector}" />`);
                }
            }
            // TODO BETTER MANAGEMENT
            const currentpageSelector = "";
            const pageCustomSelector = $html.find("select[name='pageId']");
            // Journal Id
            const valuejournalSelector = $html.find("select[name='entryId']")?.val();
            if (pageCustomSelector && valuejournalSelector) {
                const pageSelector = $html.find("select[name='pageId']");

                if (pageSelector?.length > 0) {
                    pageSelector.on("change", function () {
                        const p = pageCustomSelector.parent().find(".pin-cushion-page-icon");

                        // Pageid
                        const valuepageSelector = $html.find("select[name='pageId']")?.val();
                        if (valuepageSelector) {
                            const pageiimage = retrieveFirstImageFromJournalId(
                                valuejournalSelector,
                                valuepageSelector,
                                true,
                            );
                            if (pageiimage) {
                                p[0].src = pageiimage;
                            } else {
                                p[0].src = currentpageSelector;
                            }
                        } else {
                            p[0].src = currentpageSelector;
                        }
                    });
                    const valuepageSelector = $html.find("select[name='pageId']")?.val();
                    const pageiimage = retrieveFirstImageFromJournalId(valuejournalSelector, valuepageSelector, true);
                    if (pageiimage) {
                        pageCustomSelector
                            .parent()
                            .prepend(`<img class="pin-cushion-page-icon" src="${pageiimage}" />`);
                    } else {
                        // https://gitlab.com/tiwato/journal_icon_numbers/-/issues/33
                        // pageCustomSelector.prop("disabled", false);
                        pageCustomSelector
                            .parent()
                            .prepend(`<img class="pin-cushion-page-icon" src="${currentpageSelector}" />`);
                    }
                } else {
                    pageCustomSelector
                        .parent()
                        .prepend(`<img class="pin-cushion-page-icon" src="${currentpageSelector}" />`);
                }
            }
        }

        // TODO add image to default options ?
        // const iconSelector = html.find("select[name='icon.selected']");
        // if(iconSelector?.length > 0) {
        // 	iconSelector.children('option').each( function() {
        // 		const option = $(this);
        // 		option.prepend(`<img class="" src="${option[0].value}" />`);
        // 	});
        // }
    }

    static _addNoteGM(app, html, noteData) {
        let gmNoteFlagRef = `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PIN_GM_TEXT}`;
        // Input for GM Label
        let gmtext = noteData.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_GM_TEXT);
        if (!gmtext) gmtext = "";
        let gm_text_h = $(
            `<div class="form-group">
        <label for="${gmNoteFlagRef}">${Logger.i18n("pin-cushion.GMLabel")}</label>
        <div class="form-fields">
          <textarea
            name="${gmNoteFlagRef}">${gmtext.trim() ?? ""}</textarea>
        </div>
      </div>`,
        );
        // html.find("input[name='text']").parent().parent().after(gm_text_h);

        /*
<div class="form-group">
    <label>Text Label</label>
    <div class="form-fields">
        <input type="text" name="text" value="as22" placeholder="TEST4">
    </div>
</div>
*/

        // <input type="text" name="text" value="${initial_text.trim() ?? ''}" placeholder="${noteData.entry.name}">

        // Multiline input for Text Label
        // this.document.text || this.entry?.name || "Unknown"
        let initial_text = noteData.document.text ?? noteData.entry?.name;
        if (!initial_text) initial_text = "";
        let initial_text_h = $(
            `<div class="form-group">
        <label for="text">${Logger.i18n("pin-cushion.PlayerLabel")}</label>
        <div class="form-fields">
          <textarea name="text"
            placeholder="${noteData.entry?.name ?? ""}">${initial_text.trim() ?? ""}</textarea>
        </div>
      </div>`,
        );
        html.find("input[name='text']").parent().parent().after(initial_text_h);

        // Hide the old text label input field
        html.find("input[name='text']").parent().parent().remove();

        html.find("textarea[name='text']").parent().parent().before(gm_text_h);

        //let reveal_icon = $(`<div class='form-group'><label>Icon follows Reveal</label><div class='form-fields'><input type='checkbox' name='useRevealIcon'></div></div>`)
        //html.find("select[name='icon']").parent().parent().after(reveal_icon);

        // // Force a recalculation of the height
        // if (!app._minimized) {
        //   let pos = app.position;
        //   pos.height = 'auto';
        //   app.setPosition(pos);
        // }
    }

    /**
     * If the Note has a GM-NOTE on it, then display that as the tooltip instead of the normal text.
     * Foundry < V12
     * @param {function} [wrapped] The wrapped function provided by libWrapper
     * @param {object}   [args]    The normal arguments to Note#drawTooltip
     */
    static _textWithNoteGM(wrapped) {
        // Only override default if flag(CONSTANTS.MODULE_ID,CONSTANTS.FLAGS.PIN_GM_TEXT) is set
        const gmlabel = this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_GM_TEXT);
        return gmlabel?.length > 0 ? gmlabel : wrapped();
    }

    /**
     * If the Note has a GM-NOTE on it, then display that as the tooltip instead of the normal text.
     * Foundry V12+
     * @param {function} wrapped The wrapped function provided by libWrapper
     * @returns the label for this NoteDocument
     */
    static _labelWithNoteGM(wrapped, ...args) {
        // Only override default if flag(CONSTANTS.MODULE_ID,CONSTANTS.FLAGS.PIN_GM_TEXT) is set
        const gmlabel = this.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_GM_TEXT);
        return gmlabel?.length > 0 ? gmlabel : wrapped();
    }

    // /**
    //  * If the Note has a GM-NOTE on it, then display that as the tooltip instead of the normal text
    //  * @param {function} [wrapped] The wrapped function provided by libWrapper
    //  * @param {object}   [args]    The normal arguments to Note#drawTooltip
    //  * @returns {PIXI.Text}
    //  */
    // static _addDrawTooltipWithNoteGM(wrapped, ...args) {
    //     //const enableNoteGM = game.settings.get(CONSTANTS.MODULE_ID, 'noteGM');

    //     const hideLabel =
    //         (this.document
    //             ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.HIDE_LABEL)
    //             : this.object.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.HIDE_LABEL)) ?? false;

    //     const numberWsSuffixOnNameplate =
    //         (this.document
    //             ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.NUMBER_WS_SUFFIX_ON_NAMEPLATE)
    //             : this.object.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.NUMBER_WS_SUFFIX_ON_NAMEPLATE)) ?? 0;

    //     const ratio_width = isRealNumber(this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH))
    //         ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH)
    //         : 1;

    //     // Only override default if flag(CONSTANTS.MODULE_ID,CONSTANTS.FLAGS.PIN_GM_TEXT) is set
    //     if (game.user.isGM) {
    //         const newtextGM = this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_GM_TEXT);
    //         if (newtextGM && newtextGM.length > 0) {
    //             let result = wrapped(...args);
    //             if (hideLabel) {
    //                 result.text = "";
    //                 // this.document.text = '';
    //             } else {
    //                 if (numberWsSuffixOnNameplate > 0) {
    //                     result.text = newtextGM + " ".repeat(numberWsSuffixOnNameplate);
    //                 } else if (numberWsSuffixOnNameplate < 0) {
    //                     result.text = " ".repeat(numberWsSuffixOnNameplate * -1) + newtextGM;
    //                 } else {
    //                     result.text = newtextGM;
    //                 }
    //                 // this.document.text = newtextGM;
    //             }

    //             if (ratio_width != 1) {
    //                 let x = result.x;
    //                 let left = x + ratio_width * (this.size / 2) - 16;
    //                 result.x = left;
    //             }
    //             return result;
    //         }
    //     }

    //     //// Set a different label to be used while we call the original Note.prototype._drawTooltip
    //     ////
    //     //// Note#text          = get text()  { return this.document.label; }
    //     //// NoteDocument#label = get label() { return this.text || this.entry?.name || "Unknown"; }
    //     //// but NoteDocument#document.text can be modified :-)
    //     ////
    //     //// let saved_text = this.document.text;
    //     // this.document.text = newtext;
    //     let result = wrapped(...args);
    //     //// this.document.text = saved_text;

    //     if (hideLabel) {
    //         result.text = "";
    //     } else {
    //         if (numberWsSuffixOnNameplate > 0) {
    //             result.text = result.text + " ".repeat(numberWsSuffixOnNameplate);
    //         } else if (numberWsSuffixOnNameplate < 0) {
    //             result.text = " ".repeat(numberWsSuffixOnNameplate * -1) + result.text;
    //         }
    //     }
    //     if (ratio_width != 1) {
    //         let x = result.x;
    //         let left = x + ratio_width * (this.size / 2) - 16;
    //         result.x = left;
    //     }

    //     return result;
    // }

    /**
     * Draw the map note Tooltip as a Text object
     * @returns {PIXI.Text}
     */
    static _addDrawTooltip2(wrapped, ...args) {
        const hideLabel =
            (this.document
                ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.HIDE_LABEL)
                : this.object.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.HIDE_LABEL)) ?? false;

        const numberWsSuffixOnNameplate =
            (this.document
                ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.NUMBER_WS_SUFFIX_ON_NAMEPLATE)
                : this.object.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.NUMBER_WS_SUFFIX_ON_NAMEPLATE)) ?? 0;

        const numberHsSuffixOnNameplate =
            (this.document
                ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.NUMBER_HS_SUFFIX_ON_NAMEPLATE)
                : this.object.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.NUMBER_HS_SUFFIX_ON_NAMEPLATE)) ?? 0;

        const ratio_width = isRealNumber(this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH))
            ? this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH)
            : 1;

        //let result = wrapped(...args);
        let result = this;

        let newText = result.document.label;
        if (hideLabel) {
            newText = "";
        } else {
            // if (numberWsSuffixOnNameplate > 0) {
            //   newText = result.text + " ".repeat(numberWsSuffixOnNameplate);
            // } else if (numberWsSuffixOnNameplate < 0) {
            //   newText = " ".repeat(numberWsSuffixOnNameplate * -1) + result.text;
            // }
        }
        if (newText != result.label) {
            // this.document.update({"label": newText})
            this.tooltip.text = newText;
        }

        if (ratio_width != 1) {
            // let x = result.x;
            // let left = x + ratio_width * (result.document.iconSize / 2) - 16;

            //let left = x + (result.width / 2) - 16;
            //console.log(result, ratio_width, left, this);
            //result.transform.localTransform.tx = 30;
            //result.document.update({"x": 200})
            // WARNING : No more writable, so we need to update the document
            //result.x = left;
            let x = result.tooltip.x;
            if (numberWsSuffixOnNameplate != 0) {
                let left = x - 5 * numberWsSuffixOnNameplate;
                result.tooltip.x = left;
            } else {
                let left = x - result.document.iconSize * 2;
                result.tooltip.x = left;
            }

            let y = result.tooltip.y;
            if (numberHsSuffixOnNameplate != 0) {
                let bottom = y - 5 * numberHsSuffixOnNameplate;
                result.tooltip.y = bottom;
            } else {
                let bottom = y + result.document.iconSize / 2;
                result.tooltip.y = bottom;
            }
            return result;
        } else {
            // DO NOTHING
            return wrapped(...args);
        }
    }

    /**
     * Wraps the default Note#isVisible to allow the visibility of scene Notes to be controlled by the reveal
     * state stored in the Note (overriding the default visibility which is based on link accessibility).
     * @param {function} [wrapped] The wrapper function provided by libWrapper
     * @param {Object}   [args]    The arguments for Note#refresh
     * @return [Note]    This Note
     */
    static _isVisible(wrapped, ...args) {
        let result = wrapped(...args);
        const showOnlyToGM = this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.SHOW_ONLY_TO_GM) ?? false;
        if (String(showOnlyToGM) === "true") {
            if (!game.user.isGM) {
                return false;
            }
        }
        /*
    We only want to change the check of testUserPermission here
    Note#isVisible()
        const accessTest = this.page ? this.page : this.entry;
        const access = accessTest?.testUserPermission(game.user, "LIMITED") ?? true;
        if ( (access === false) || !canvas.effects.visibility.tokenVision || this.document.global ) return access;
        const point = {x: this.document.x, y: this.document.y};
        const tolerance = this.document.iconSize / 4;
        return canvas.effects.visibility.testVisibility(point, {tolerance, object: this});
    */
        // See if reveal state is enabled for this note.
        if (!this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.USE_PIN_REVEALED)) {
            return wrapped(...args);
        }

        // Replace the testUserPermission test of Note#isVisible
        const access = this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_IS_REVEALED);
        // Standard version of Note#isVisible
        if (access === false || !canvas.effects.visibility.tokenVision || this.document.global) {
            return access;
        }
        const point = { x: this.document.x, y: this.document.y };
        const tolerance = this.document.iconSize / 4;
        return canvas.effects.visibility.testVisibility(point, { tolerance, object: this });
    }

    /**
     * Ensure player notes are updated immediately
     * @param {*} wrapped
     * @param  {...any} args
     * @returns
     */
    static _noteUpdate(wrapped, ...args) {
        const revealedNotes = game.settings.get(CONSTANTS.MODULE_ID, "revealedNotes");
        const [data, options, userId] = args;
        if (revealedNotes) {
            // Foundry V11: Note#_onUpdate needs to set refreshText render flag
            let result = wrapped(data, options, userId);
            if (this.renderFlags && data?.flags?.[CONSTANTS.MODULE_ID]) {
                // Ensure everything is redrawn - since icon colour might change, not just visibility
                this.renderFlags.set({ redraw: true });
            }
            return result;
        } else {
            if (this.renderFlags && data?.flags?.[CONSTANTS.MODULE_ID]) {
                // Ensure everything is redrawn - since icon colour might change, not just visibility
                this.renderFlags.set({ redraw: true });
            }
            return wrapped(...args);
        }
    }

    static _applyRenderFlags(wrapped, ...args) {
        let result = wrapped(...args);
        const hideLabel = this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.HIDE_LABEL) ?? false;

        if (hideLabel) {
            this.tooltip.visible = false;
        } else {
            let textAlwaysVisible =
                this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.TEXT_ALWAYS_VISIBLE) ?? false;
            if (textAlwaysVisible === true) {
                this.tooltip.visible = true;
            }
        }
        //TODO Loop memory usage ??
        // this.refresh();

        return result;
    }

    /**
     * Wraps the default Note#refresh to allow the visibility of scene Notes to be controlled by the reveal
     * state stored in the Note (overriding the default visibility which is based on link accessibility).
     * @param {function} [wrapped] The wrapper function provided by libWrapper
     * @param {Object}   [args]    The arguments for Note#refresh
     * @return [Note]    This Note
     */
    static _noteRefresh(wrapped, ...args) {
        let result = wrapped(...args);

        let textAlwaysVisible =
            this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.TEXT_ALWAYS_VISIBLE) ?? false;
        // let textVisible = this.hover;
        if (textAlwaysVisible === true) {
            // Keep tooltip always visible
            // Though could make an option out of that too. Would be nicer
            // TODO it's seem we don't need this
            // this.position.set(this.document.x, this.document.y);
            // this.controlIcon.border.visible = this.hover;

            // textVisible = true;
            this.tooltip.visible = true;
        }
        // this.tooltip.visible = textVisible;
        //this.visible = this.entry?.testUserPermission(game.user, "LIMITED") ?? true;

        let text = this.children[1]; // 0 is the ControlIcon, 1 is the PreciseText
        // Text is created bevor this point. So we can modify it here.
        let ratio = this.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH);
        if (ratio && text?.x) {
            text.x = (this.size * (ratio - 1)) / 2; // correct shifting for the new scale.
        }
        // Bug fixing :Always (when hover) show name of pin up (above) to others pin
        // https://stackoverflow.com/questions/24909371/move-item-in-array-to-last-position
        if (!isAlt() && this.hover) {
            const fromIndex = canvas.notes.placeables.findIndex((note) => note.id === this.id) || 0;
            canvas.notes.placeables.push(canvas.notes.placeables.splice(fromIndex, 1)[0]);
        }

        /*
    // NEW FEATURE : Above fog feature
    let aboveFogS = String(
    getProperty(this.document, `this.document.flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ABOVE_FOG}`),
    );
    if (aboveFogS !== 'true' && aboveFogS !== 'false') {
    aboveFogS = 'false';
    }
    const aboveFog = String(aboveFogS) === 'true' ? true : false;
    if(aboveFog){
    setProperty(this,`zIndex`, 300);
    }
    */

        return result;
    }

    /* -------------------------------- Listeners ------------------------------- */

    /**
     * Handles doubleclicks
     * @param {*} event
     */
    static _onDoubleClick(event) {
        if (canvas.activeLayer._hover) {
            return;
        }

        // Silently return when note creation permissions are missing
        if (!game.user.can("NOTE_CREATE")) return;

        // Warn user when notes can be created, but journal entries cannot
        if (!game.user.can("JOURNAL_CREATE")) {
            Logger.warn(
                game.i18n.format("PinCushion.AllowPlayerNotes", {
                    permission: Logger.i18n("PERMISSION.JournalCreate"),
                }),
                true,
            );
            return;
        }

        const data = {
            clientX: event.data.global.x,
            clientY: event.data.global.y,
        };

        API.pinCushion._createDialog(data);
    }

    //   static async _onSingleClick(event) {
    //     Logger.log(
    //       `Note_onClickLeft: ${event.data.origin.x} ${event.data.origin.y} == ${event.data.global.x} ${event.data.global.y}`
    //     );
    //     // Create a new Note at the cursor position and open the Note configuration window for it.
    //     const noteData = { x: event.data.origin.x, y: event.data.origin.y };
    //     this._createPreview(noteData, { top: event.data.global.y - 20, left: event.data.global.x + 40 });
    //   }

    static _drawControlIconInternal(noteInternal) {
        // Wraps the default Note#_drawControlIcon so that we can override the stored icon tint based
        // on whether the link is accessible for the current player (or not). This is only done for links which
        // are using the "revealed" flag.
        const revealedNotes = game.settings.get(CONSTANTS.MODULE_ID, "revealedNotes");
        if (revealedNotes) {
            if (game.user.isGM) {
                // Replacement for Note#_drawControlIcon for GMs, to show which pins are revealed.
                const is_revealed = noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_IS_REVEALED);
                if (is_revealed != undefined) {
                    const colour = game.settings.get(
                        CONSTANTS.MODULE_ID,
                        is_revealed ? "revealedNotesTintColorRevealed" : "revealedNotesTintColorNotRevealed",
                    );
                    if (colour?.length > 0) {
                        // Temporarily set the icon tint
                        const saved = noteInternal.document.texture.tint;
                        noteInternal.document.texture.tint = colour;
                        // const result = wrapped(...args);
                        noteInternal.document.texture.tint = saved;
                        // return result;
                    }
                }
            } else {
                // if (!noteInternal.document.getFlag(MODULE_ID, USE_PIN_REVEALED)) return wrapped(...args);
                const use_reveal = noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.USE_PIN_REVEALED);
                if (use_reveal === undefined || !use_reveal) {
                    // return wrapped(...args);
                } else {
                    const value = noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.USE_PIN_REVEALED);
                    if (value !== undefined) {
                        const is_linked = noteInternal.entry?.testUserPermission(
                            game.user,
                            CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
                        );
                        const colour = game.settings.get(
                            CONSTANTS.MODULE_ID,
                            is_linked ? "revealedNotesTintColorLink" : "revealedNotesTintColorNotLink",
                        );
                        if (colour?.length > 0) {
                            // Temporarily set the icon tint
                            const saved = noteInternal.document.texture.tint;
                            noteInternal.document.texture.tint = colour;
                            // const result = wrapped(...args);
                            noteInternal.document.texture.tint = saved;
                            // return result;
                        }
                    }
                }
            }
        }

        let tint = noteInternal.document.texture.tint ? Color.from(noteInternal.document.texture.tint) : null;
        let currentIcon = noteInternal.document.texture.src;
        const pinIsTransparent = noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PIN_IS_TRANSPARENT);
        if (String(pinIsTransparent) === "true") {
            currentIcon = CONSTANTS.PATH_TRANSPARENT;
        }

        let iconData = {
            texture: stripQueryStringAndHashFromPath(currentIcon),
            size: noteInternal.document.iconSize,
            tint: tint,
        };
        let icon;
        // this is note
        if (
            noteInternal.document &&
            noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.HAS_BACKGROUND)
        ) {
            icon = new ControlIcon(iconData);
            icon.x -= noteInternal.document.iconSize / 2;
            icon.y -= noteInternal.document.iconSize / 2;
        } else {
            const enableBackgroundlessPins = game.settings.get(CONSTANTS.MODULE_ID, "enableBackgroundlessPins");
            if (enableBackgroundlessPins) {
                icon = new BackgroundlessControlIcon(iconData);
                icon.x -= noteInternal.document.iconSize / 2;
                icon.y -= noteInternal.document.iconSize / 2;
            } else {
                icon = new ControlIcon(iconData);
                icon.x -= noteInternal.document.iconSize / 2;
                icon.y -= noteInternal.document.iconSize / 2;
            }
        }
        const ratio_width = isRealNumber(
            noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH),
        )
            ? noteInternal.document.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.RATIO_WIDTH)
            : 1;
        if (ratio_width != 1) {
            if (noteInternal.document) {
                icon.width = icon.width * ratio_width; // TODO not sure about this
            }
            // else{
            //   icon.width = noteInternal.getFlag(CONSTANTS.MODULE_ID,  CONSTANTS.FLAGS.RATIO_WIDTH); // compatibility 0.8.9
            // }
            // TODO need to centre text of the nameplate ??
            // https://github.com/p4535992/foundryvtt-pin-cushion/issues/66
            // https://github.com/p4535992/foundryvtt-pin-cushion/issues/52
        }
        // PATCH MODULE autoIconFlags
        if (noteInternal.document?.flags?.autoIconFlags) {
            const flagsAutomaticJournalIconNumbers = {
                autoIcon: noteInternal.document?.flags.autoIconFlags.autoIcon,
                iconType: noteInternal.document?.flags.autoIconFlags.iconType,
                iconText: noteInternal.document?.flags.autoIconFlags.iconText,
                foreColor: noteInternal.document?.flags.autoIconFlags.foreColor,
                backColor: noteInternal.document?.flags.autoIconFlags.backColor,
                fontFamily: noteInternal.document?.flags.autoIconFlags.fontFamily,
            };
            if (flagsAutomaticJournalIconNumbers.fontFamily) {
                noteInternal.document.fontFamily = flagsAutomaticJournalIconNumbers.fontFamily;
            }
            //noteInternal.controlIcon?.bg?.fill = flagsAutomaticJournalIconNumbers.backColor;
        }
        // icon.x -= noteInternal.size / 2;
        // icon.y -= noteInternal.size / 2;
        return icon;
        // } else {
        //   return undefined;
        // }
    }

    static _noteConfigGetData(wrapped, ...args) {
        let noteData = wrapped(...args);
        if (game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsEnabled")) {
            noteData = PinCushion.pinPlayerDefaultsGetData(noteData);
        }
        return noteData;
    }

    static _noteConfigGetSubmitData(wrapped, ...args) {
        let data = wrapped(...args);
        if (game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsEnabled")) {
            data = PinCushion.pinPlayerDefaultsGetSubmitData(data);
        }
        return data;
    }

    /*
getData wrapper.
Here we override with the custom defaults what is presented to the player in  the NoteConfig.
Won't be used if GM or if the defaults have already been applied
 */
    static pinPlayerDefaultsGetData(noteData) {
        if (game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsEnabled")) {
            return noteData;
        }

        // Show only the original text, without the name
        const originalText = foundry.utils.getProperty(
            this.document,
            `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_ORIGINAL_TEXT}`,
        );
        if (originalText) {
            noteData.data.text = originalText;
        }
        const isDefaulted = foundry.utils.getProperty(
            this.document,
            `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_IS_DEFAULTED}`,
        );
        if (game.user.isGM || isDefaulted) {
            return noteData;
        }
        Logger.log(noteData);
        // Apply the defaults
        const defaults = PinCushion._getPinDefaults();
        noteData = foundry.utils.mergeObject(noteData, defaults);

        return noteData;
    }

    /*
     * getSubmitData wrapper.
     * Here we perform operations after the note has been submitted. Operations include:
     * - Adding the character name
     * - Store the text before adding the name
     * - Setting a flag to indicate that the new defaults have been applied
     */
    static pinPlayerDefaultsGetSubmitData(data) {
        if (game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsEnabled")) {
            return data;
        }
        // Append name
        if (game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsAddPlayerName")) {
            const characterName =
                foundry.utils.getProperty(
                    this.document,
                    `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_CHARACTER_NAME}`,
                ) ||
                game.user.character?.name ||
                game.user.name;
            foundry.utils.setProperty(
                data,
                `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_ORIGINAL_TEXT}`,
                data.text,
            );
            foundry.utils.setProperty(
                data,
                `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_CHARACTER_NAME}`,
                characterName,
            );
            data.text += `\n${characterName}`;
        }

        // Set flags
        const isDefaulted = foundry.utils.getProperty(
            this.document,
            `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_IS_DEFAULTED}`,
        );
        if (game.user.isGM || isDefaulted) {
            return data;
        }
        foundry.utils.setProperty(
            data,
            `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PLAYER_PIN_DEFAULTS_IS_DEFAULTED}`,
            true,
        );
        //if (!game.user.isGM && modSetting('alwaysShowText') && pinCushionInstalled()) {
        //    data['flags.pin-cushion.textAlwaysVisible'] = true;
        //}
        return data;
    }

    /**
     * Returns the object containing the defaults used for overriding the getData in NoteConfig
     */
    static _getPinDefaults() {
        // Grab data from user
        const playerColor = game.user.color;
        const tokenImg = game.user.character.prototypeToken?.texture.src;

        // Icon (token or default)
        const usePlayerToken =
            game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsPlayerToken") && tokenImg?.length > 0;
        const defaultImage = game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsPinImage");
        let customIcon = null;
        if (usePlayerToken) {
            customIcon = tokenImg;
        } else if (defaultImage?.length > 0) {
            customIcon = defaultImage;
        }
        // Tint
        const usePlayerColorTint = game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsPlayerColorImage");
        let tintIcon = null;
        if (usePlayerColorTint && !usePlayerToken) {
            tintIcon = playerColor;
        }
        // Returned object
        let defaults = {
            data: {
                global: game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsGlobal"),
                iconSize: game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsImageSize"),
                textAnchor: game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsAnchorPoint"),
                textColor: game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsPlayerColorText")
                    ? playerColor
                    : null,
                fontSize: game.settings.get(CONSTANTS.MODULE_ID, "playerPinDefaultsFontSize"),
                texture: {
                    tint: tintIcon,
                },
            },
            icon: {
                selected: customIcon ? "" : null,
                custom: customIcon,
            },
        };

        // Remove nulls & return
        defaults = foundry.utils.flattenObject(defaults);
        // eslint-disable-next-line no-unused-vars
        defaults = Object.fromEntries(Object.entries(defaults).filter(([_, v]) => v != null));
        defaults = foundry.utils.expandObject(defaults);
        return defaults;
    }

    /**
     * Handles draw control icon
     * @param {*} event
     */
    static _drawControlIcon(...args) {
        const res = PinCushion._drawControlIconInternal(this);
        /*
    // Above fog feature
    let aboveFogS = String(
    getProperty(this.document, `this.document.flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ABOVE_FOG}`),
    );
    if (aboveFogS !== 'true' && aboveFogS !== 'false') {
    aboveFogS = 'false';
    }
    const aboveFog = String(aboveFogS) === 'true' ? true : false;
    if(aboveFog){
    setProperty(this,`zIndex`, 300);
    }
    */
        if (res === undefined) {
            // return wrapped(...args);
        } else {
            return res;
        }
    }

    /**
     * Defines the icon to be drawn for players if enabled.
     */
    static _onPrepareNoteData(wrapped) {
        wrapped();

        // IF not GM and IF  = enabled then take flag path as note.document.texture.src
        if (!game.user.isGM) {
            if (this?.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PLAYER_ICON_STATE)) {
                this.texture.src = stripQueryStringAndHashFromPath(
                    this.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.PLAYER_ICON_PATH),
                );
            }
        }
    }

    static _renderJournalThumbnail(app, html) {
        game.journal.render();
    }

    static _addJournalThumbnail(app, html, data) {
        const isGM = game.user.isGM;
        const enabledForGM = game.settings.get(CONSTANTS.MODULE_ID, "enableJournalThumbnailForGMs");
        const enabledForPlayers = game.settings.get(CONSTANTS.MODULE_ID, "enableJournalThumbnailForPlayers");

        if ((isGM && enabledForGM) || (!isGM && enabledForPlayers)) {
            // Zbieramy dokumenty z kolekcji aplikacji
            const journals = app.collection?.contents ?? []; // app.collection to JournalEntry collection

            for (const journal of journals) {
                const $html = ensureJquery(html);
                const htmlEntry = $html.find(`.directory-item.document[data-document-id="${journal.id}"]`);
                if (htmlEntry.length !== 1) continue;

                const journalEntryImage = retrieveFirstImageFromJournalId(journal.id, void 0, false);
                if (!journalEntryImage) continue;

                let thumbnail = null;
                if (journalEntryImage.endsWith(".pdf")) {
                    thumbnail = $(
                        `<img class="pin-cushion-thumbnail sidebar-image journal-entry-image" src="${CONSTANTS.PATH_PDF_THUMBNAIL}" title="${journal.name}" alt="Journal Entry Thumbnail">`,
                    );
                } else {
                    thumbnail = $(
                        `<img class="pin-cushion-thumbnail sidebar-image journal-entry-image" src="${journalEntryImage}" title="${journal.name}" alt="Journal Entry Thumbnail">`,
                    );
                }

                const position = game.settings.get(CONSTANTS.MODULE_ID, "journalThumbnailPosition");
                switch (position) {
                    case "right":
                        htmlEntry.append(thumbnail);
                        break;
                    case "left":
                        htmlEntry.prepend(thumbnail);
                        break;
                    default:
                        Logger.warn(`Must set 'right' or 'left' for sidebar thumbnail image`);
                }
            }
        }
    }

    static _deleteJournalDirectoryPagesEntry() {
        if (game.settings.get(CONSTANTS.MODULE_ID, "enableJournalDirectoryPages")) {
            ui.sidebar.tabs.journal.render(true);
            for (let window of [...Object.values(ui.windows)].filter((w) => w.title == "Journal Directory")) {
                window.render(true);
            }
        }
    }

    static _createJournalDirectoryPagesEntry() {
        if (game.settings.get(CONSTANTS.MODULE_ID, "enableJournalDirectoryPages")) {
            ui.sidebar.tabs.journal.render(true);
            for (let window of [...Object.values(ui.windows)].filter((w) => w.title == "Journal Directory")) {
                window.render(true);
            }
        }
    }

    static _addJournalDirectoryPages(app, html, options) {
        if (game.settings.get(CONSTANTS.MODULE_ID, "enableJournalDirectoryPages")) {
            for (let j of app.documents) {
                if (!j.pages.size) continue;
                let $li = html.find(`li[data-document-id="${j.id}"]`);
                $li.css({ flex: "unset", display: "block" });
                let $button = $(
                    `<a class="toggle" style="width:50px; float: right; text-align: right; padding-right: .5em;"><i class="fa-solid fa-caret-down"></i></a>`,
                ).click(function (e) {
                    e.stopPropagation();
                    $(this).parent().parent().find("ol").toggle();
                    $(this).parent().parent().find("ol").is(":hidden")
                        ? $(this).html('<i class="fa-solid fa-caret-down"></i>')
                        : $(this).html('<i class="fa-solid fa-caret-up"></i>');
                });
                $li.find("h4").append($button).css({ "flex-basis": "100%", overflow: "ellipsis" });
                let $ol = $(`<ol class="journal-pages" style="width:100%; margin-left: 1em;" start="0"></ol>`);
                $ol.hide();
                for (let p of j.pages.contents.sort((a, b) => {
                    return a.sort - b.sort;
                }))
                    $ol.append($(`<li class="journal-page" data-page-uuid="${p.uuid}"><a>${p.name}</a></li>`));
                $li.append($ol);
            }
            $(html)
                .find("li.journal-page > a")
                .click(function (e) {
                    e.stopPropagation();
                    let page = fromUuidSync($(this).parent().data().pageUuid);
                    if (!page) return;
                    page.parent.sheet.render(true, { pageId: page.id, focus: true });
                })
                .contextmenu(function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    let page = fromUuidSync($(this).parent().data().pageUuid);
                    if (!page) return;
                    page.sheet.render(true);
                });
        }
    }

    /**
     * Sets whether this Note is revealed (visible) to players; overriding the default FoundryVTT rules.
     * The iconTint/texture.tint will also be set on the Note based on whether there is a link that the player can access.
     * If this function is never called then the default FoundryVTT visibility rules will apply
     * @param [NoteData] [notedata] The NoteData whose visibility is to be set (can be used before the Note has been created)
     * @param {Boolean}  [visible]  pass in true if the Note should be revealed to players
     */
    static setNoteRevealed(notedata, visible) {
        const revealedNotes = game.settings.get(CONSTANTS.MODULE_ID, "revealedNotes");
        if (revealedNotes) {
            visible = getProperty(notedata, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PIN_IS_REVEALED}`);
            if (visible) {
                const FLAG_IS_REVEALED = `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.PIN_IS_REVEALED}`;
                const FLAG_USE_REVEALED = `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.USE_PIN_REVEALED}`;
                // notedata might not exist as a Note, so setFlag is not available
                setProperty(notedata, FLAG_USE_REVEALED, true);
                setProperty(notedata, FLAG_IS_REVEALED, visible);
            }
        }
    }

    //NOT USED
    // static renderHeadsUpDisplayV1(hud, html, data) {
    //     canvas.hud.PinCushion = new PinCushionHUD();
    //     const hudTemp = document.createElement("template");
    //     hudTemp.id = "pin-cushion-hud";
    //     html.append(hudTemp);
    // }

    /**
     * Note.prototype._onClickLeft and Note.prototype._onClickRight seem to work only on the NoteLayer
     * @href https://github.com/foundryvtt/foundryvtt/issues/8770
     * @param {*} wrapped
     * @param  {...any} args
     * @returns
     */
    static _canControl(wrapped, ...args) {
        if (canvas.activeLayer instanceof TokenLayer) {
            Logger.info(`Applied can control override`);
            const [user, event] = args;
            if (this.isPreview) {
                return false;
            }
            // return this.document.canUserModify(user, "update");
            const enableDragNoteOnTokenLayerIfGM = game.settings.get(
                CONSTANTS.MODULE_ID,
                "enableDragNoteOnTokenLayerIfGM",
            );
            if (enableDragNoteOnTokenLayerIfGM && game.user.isGM) {
                return true;
            }
        }
        let result = wrapped(...args);
        return result;
    }

    // 2024-05-01... work but i don't like...
    // static drawTooltipHandler(wrapped, ...args) {
    //     const note = this;
    //     PinCushionPixiHelpers.drawTooltipPixi(note);
    //     return wrapped(...args);
    // }
}
function ensureJquery(html) {
    // If it's already jQuery, return it
    if (html instanceof jQuery) return html;

    // If it's an HTMLElement, convert it
    if (html instanceof HTMLElement) return $(html);

    // If it's something else, wrap it anyway (fallback)
    return $(html);
}
