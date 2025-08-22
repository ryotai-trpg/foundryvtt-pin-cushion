import { PinCushion } from "./apps/PinCushion.js";
import CONSTANTS from "./constants.js";

export const registerSettings = function () {
    game.settings.registerMenu(CONSTANTS.MODULE_ID, "resetAllSettings", {
        name: `pin-cushion.SETTINGS.reset.name`,
        hint: `pin-cushion.SETTINGS.reset.hint`,
        icon: "fas fa-coins",
        type: ResetSettingsDialog,
        restricted: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "forceToShowNotes", {
        name: `pin-cushion.SETTINGS.forceToShowNotesN`,
        hint: `pin-cushion.SETTINGS.forceToShowNotesH`,
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "previewMaxLength", {
        name: `pin-cushion.SETTINGS.PreviewMaxLengthN`,
        hint: `pin-cushion.SETTINGS.PreviewMaxLengthH`,
        scope: "world",
        type: Number,
        default: 500,
        config: true,
        onChange: (s) => {},
    });

    game.settings.register(CONSTANTS.MODULE_ID, "previewDelay", {
        name: `pin-cushion.SETTINGS.PreviewDelayN`,
        hint: `pin-cushion.SETTINGS.PreviewDelayH`,
        scope: "world",
        type: Number,
        default: 500,
        config: true,
        onChange: (s) => {},
        //@ts-ignore
        range: { min: 100, max: 3000, step: 100 }, // bug https://github.com/p4535992/foundryvtt-pin-cushion/issues/18
    });

    game.settings.register(CONSTANTS.MODULE_ID, "defaultJournalPermission", {
        name: `pin-cushion.SETTINGS.DefaultJournalPermissionN`,
        hint: `pin-cushion.SETTINGS.DefaultJournalPermissionH`,
        scope: "world",
        type: Number,
        choices: Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS).reduce((acc, [perm, key]) => {
            acc[key] = `pin-cushion.SETTINGS.DefaultJournalPermission.PERMISSION.${perm}`;
            return acc;
        }, {}),
        default: 0,
        config: true,
        onChange: (s) => {},
    });

    game.settings.register(CONSTANTS.MODULE_ID, "defaultJournalFolder", {
        name: `pin-cushion.SETTINGS.DefaultJournalFolderN`,
        hint: `pin-cushion.SETTINGS.DefaultJournalFolderH`,
        scope: "world",
        type: String,
        choices: {
            none: `pin-cushion.None`,
            perUser: `pin-cushion.PerUser`,
            specificFolder: `pin-cushion.PerSpecificFolder`,
        },
        default: "none",
        config: true,
        onChange: (s) => {
            // Only run check for folder creation for the main GM
            if (s === "perUser" && game.user === game.users.find((u) => u.isGM && u.active)) {
                PinCushion._createFolders();
            }
        },
    });

    game.settings.register(CONSTANTS.MODULE_ID, "defaultNoteImageOnCreate", {
        name: `pin-cushion.SETTINGS.defaultNoteImageOnCreateN`,
        hint: `pin-cushion.SETTINGS.defaultNoteImageOnCreateH`,
        scope: "world",
        type: String,
        default: "",
        config: true,
        filePicker: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "specificFolder", {
        name: `pin-cushion.SETTINGS.SpecificFolderN`,
        hint: `pin-cushion.SETTINGS.SpecificFolderH`,
        scope: "world",
        type: String,
        choices: () => {
          let folders;
          if(game.release.generation < 13){
            folders = game.journal.directory.folders.sort((a, b) => a.name.localeCompare(b.name));
          }
          else{
            folders = Array.from(game.journal.directory.collection.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
          }
            const arrObj = {};
            arrObj[""] = "Select a journal folder";
            Object.entries(folders).reduce((folder, [k, v]) => {
                folder[v.id] = v.name;
                arrObj[v.id] = v.name;
                return folder;
            }, {});
            return arrObj;
        },
        default: 0,
        config: true,
        onChange: (s) => {},
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableBackgroundlessPins", {
        name: `pin-cushion.SETTINGS.EnableBackgroundlessPinsN`,
        hint: `pin-cushion.SETTINGS.EnableBackgroundlessPinsH`,
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "showJournalImageByDefault", {
        name: `pin-cushion.SETTINGS.ShowJournalImageByDefaultN`,
        hint: `pin-cushion.SETTINGS.ShowJournalImageByDefaultH`,
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableTooltipByDefault", {
        name: `pin-cushion.SETTINGS.enableTooltipByDefaultN`,
        hint: `pin-cushion.SETTINGS.enableTooltipByDefaultH`,
        scope: "world",
        type: Boolean,
        default: false,
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableAutoScaleNamePlatesNote", {
        name: `pin-cushion.SETTINGS.enableAutoScaleNamePlatesNoteN`,
        hint: `pin-cushion.SETTINGS.enableAutoScaleNamePlatesNoteH`,
        scope: "world",
        type: Boolean,
        default: false,
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableDragNoteOnTokenLayerIfGM", {
        name: `pin-cushion.SETTINGS.enableDragNoteOnTokenLayerIfGMN`,
        hint: `pin-cushion.SETTINGS.enableDragNoteOnTokenLayerIfGMH`,
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerIconAutoOverride", {
        name: `pin-cushion.SETTINGS.PlayerIconAutoOverrideN`,
        hint: `pin-cushion.SETTINGS.PlayerIconAutoOverrideH`,
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerIconPathDefault", {
        name: `pin-cushion.SETTINGS.PlayerIconPathDefaultN`,
        hint: `pin-cushion.SETTINGS.PlayerIconPathDefaultH`,
        scope: "world",
        config: true,
        default: "icons/svg/book.svg",
        type: String,
        filePicker: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "noteGM", {
        name: `pin-cushion.SETTINGS.noteGMN`,
        hint: `pin-cushion.SETTINGS.noteGMH`,
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "revealedNotes", {
        name: `pin-cushion.SETTINGS.revealedNotesN`,
        hint: `pin-cushion.SETTINGS.revealedNotesH`,
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "revealedNotesTintColorLink", {
        name: `pin-cushion.SETTINGS.revealedNotesTintColorLinkN`,
        hint: `pin-cushion.SETTINGS.revealedNotesTintColorLinkH`,
        scope: "world",
        type: String,
        default: "#7CFC00",
        config: true,
        onChange: () => {
            if (canvas?.ready) {
                canvas.notes.placeables.forEach((note) => note.draw());
                //for (let note of canvas.notes.objects) note.draw();
            }
        },
    });

    game.settings.register(CONSTANTS.MODULE_ID, "revealedNotesTintColorNotLink", {
        name: `pin-cushion.SETTINGS.revealedNotesTintColorNotLinkN`,
        hint: `pin-cushion.SETTINGS.revealedNotesTintColorNotLinkH`,
        scope: "world",
        type: String,
        default: "#c000c0",
        config: true,
        onChange: () => {
            if (canvas?.ready) {
                canvas.notes.placeables.forEach((note) => note.draw());
                //for (let note of canvas.notes.objects) note.draw();
            }
        },
    });

    game.settings.register(CONSTANTS.MODULE_ID, "revealedNotesTintColorRevealed", {
        name: `pin-cushion.SETTINGS.revealedNotesTintColorRevealedN`,
        hint: `pin-cushion.SETTINGS.revealedNotesTintColorRevealedH`,
        scope: "world",
        type: String,
        default: "#ffff00",
        config: true,
        onChange: () => refresh(),
    });

    game.settings.register(CONSTANTS.MODULE_ID, "revealedNotesTintColorNotRevealed", {
        name: `pin-cushion.SETTINGS.revealedNotesTintColorNotRevealedN`,
        hint: `pin-cushion.SETTINGS.revealedNotesTintColorNotRevealedH`,
        scope: "world",
        type: String,
        default: "#ff0000",
        config: true,
        onChange: () => refresh(),
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableJournalThumbnailForGMs", {
        name: `pin-cushion.SETTINGS.enableJournalThumbnailForGMsN`,
        hint: `pin-cushion.SETTINGS.enableJournalThumbnailForGMsH`,
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
        onchange: () => window.location.reload(),
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableJournalThumbnailForPlayers", {
        name: `pin-cushion.SETTINGS.enableJournalThumbnailForPlayersN`,
        hint: `pin-cushion.SETTINGS.enableJournalThumbnailForPlayersH`,
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
        onchange: () => window.location.reload(),
    });

    game.settings.register(CONSTANTS.MODULE_ID, "journalThumbnailPosition", {
        name: `pin-cushion.SETTINGS.journalThumbnailPositionN`,
        hint: `pin-cushion.SETTINGS.journalThumbnailPositionH`,
        scope: "world",
        config: true,
        default: "right",
        type: String,
        choices: {
            right: "Right",
            left: "Left",
        },
        onChange: () => game.journal.render(),
    });

    game.settings.register(CONSTANTS.MODULE_ID, "fontSize", {
        name: `pin-cushion.SETTINGS.fontSizeN`,
        hint: `pin-cushion.SETTINGS.fontSizeH`,
        scope: "client",
        type: String,
        default: "",
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "maxWidth", {
        name: `pin-cushion.SETTINGS.maxWidthN`,
        hint: `pin-cushion.SETTINGS.maxWidthH`,
        scope: "client",
        type: Number,
        default: 800,
        config: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "tooltipUseMousePositionForCoordinates", {
        name: `pin-cushion.SETTINGS.tooltipUseMousePositionForCoordinatesN`,
        hint: `pin-cushion.SETTINGS.tooltipUseMousePositionForCoordinatesH`,
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    // DEPRECATED ON V11
    //   game.settings.register(CONSTANTS.MODULE_ID, "oneClickNoteCreation", {
    //     name: `pin-cushion.SETTINGS.oneClickNoteCreationN`,
    //     hint: `pin-cushion.SETTINGS.oneClickNoteCreationH`,
    //     scope: "world",
    //     config: true,
    //     default: false,
    //     type: Boolean,
    //   });

    game.settings.register(CONSTANTS.MODULE_ID, "enableJournalAnchorLink", {
        name: `pin-cushion.SETTINGS.enableJournalAnchorLinkN`,
        hint: `pin-cushion.SETTINGS.enableJournalAnchorLinkH`,
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "enableJournalDirectoryPages", {
        name: `pin-cushion.SETTINGS.enableJournalDirectoryPagesN`,
        hint: `pin-cushion.SETTINGS.enableJournalDirectoryPagesH`,
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    // ============================================
    // Pin Players Default
    // =============================================

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsEnabled", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.enableN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.enableH`,
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsGlobal", {
        name: `pin-cushion.SETTINGS.globalN`,
        hint: `pin-cushion.SETTINGS.globalH`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsPinImage", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.pinImageN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.pinImageH`,
        scope: "world",
        config: true,
        type: String,
        default: "",
        filePicker: "imagevideo",
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsPlayerColorImage", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.playerColorImageN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.playerColorImageH`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsPlayerToken", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.playerTokenN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.playerTokenH`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsImageSize", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.imageSizeN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.imageSizeH`,
        scope: "world",
        config: true,
        type: Number,
        default: 100,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsFontSize", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.fontSizeN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.fontSizeH`,
        scope: "world",
        config: true,
        type: Number,
        default: 32,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsAnchorPoint", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.anchorPointN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.anchorPointH`,
        scope: "world",
        config: true,
        type: Number,
        default: 1,
        choices: {
            0: "Center",
            1: "Bottom",
            2: "Top",
            3: "Left",
            4: "Right",
        },
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsAddPlayerName", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.addPlayerNameN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.addPlayerNameH`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "playerPinDefaultsPlayerColorText", {
        name: `pin-cushion.SETTINGS.playerPinDefaults.playerColorTextN`,
        hint: `pin-cushion.SETTINGS.playerPinDefaults.playerColorTextH`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(CONSTANTS.MODULE_ID, "debug", {
        name: `pin-cushion.SETTINGS.debugN`,
        hint: `pin-cushion.SETTINGS.debugH`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });
};
class ResetSettingsDialog extends FormApplication {
    constructor(...args) {
        //@ts-ignore
        super(...args);
        //@ts-ignore
        return new Dialog({
            title: game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.title`),
            content:
                '<p style="margin-bottom:1rem;">' +
                game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.content`) +
                "</p>",
            buttons: {
                confirm: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.confirm`),
                    callback: async () => {
                        const worldSettings = game.settings.storage
                            ?.get("world")
                            ?.filter((setting) => setting.key.startsWith(`${CONSTANTS.MODULE_ID}.`));
                        for (let setting of worldSettings) {
                            console.log(`Reset setting '${setting.key}'`);
                            await setting.delete();
                        }
                        //window.location.reload();
                    },
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.cancel`),
                },
            },
            default: "cancel",
        });
    }
    async _updateObject(event, formData) {
        // do nothing
    }
}
