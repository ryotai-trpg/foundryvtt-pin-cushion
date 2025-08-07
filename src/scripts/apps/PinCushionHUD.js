import CONSTANTS from "../constants.js";
import { PinCushionPixiHelpers } from "../pixi/pin-cushion-pixi-helpers.js";

export class PinCushionHUD extends foundry.applications.api.ApplicationV2 {
    constructor(note, options = {}) {
        const data = note && typeof note === "object" && "document" in note ? note.document : note || {};
        super(data, options);
        this.object = note;
        this.data = data;
        this.contentTooltip = "";
        this.HUDtitle = "";
        this.flags = false;
    }

    static get defaultOptions() {
        // Pobierz domyślne opcje klasy bazowej (Application / ApplicationV2)
        const baseOptions = super.defaultOptions ?? {};
        return foundry.utils.mergeObject(baseOptions, {
            id: "pin-cushion-hud",
            classes: [...(baseOptions.classes ?? []), "pin-cushion-hud"],
            template: "modules/pin-cushion/templates/hud-content.hbs",
            minimizable: false,
            resizable: false,
            width: 300,
            height: "auto",
        });
    }

    async getData() {
        const noteData = await PinCushionPixiHelpers._manageContentHtmlFromNote(this.object);
        this.data = noteData;
        const customTooltip = this.data.document?.flags?.["pin-cushion"]?.tooltipCustomDescription;

        if (customTooltip === undefined) {
            ui.notifications.warn(game.i18n.localize("pin-cushion.UIWarningLackOfFlags"));
             this.flags = false;
            return {flags: false}
        }
          this.flags = true;
        if(customTooltip === "" && this.data.document.pageId !== null){
              this.contentTooltip = noteData.content;
        }
        else{
             this.contentTooltip = customTooltip;
        }

        this.fontSize = noteData.fontSize || (canvas?.grid?.size ?? 100) / 5;
        this.maxWidth = noteData.maxWidth || 400;
        this.HUDtitle = noteData.title;

        console.log(noteData)
        return {
            flags: true,
            HUDtitle: this.HUDtitle,
            contentTooltip: this.data.document.flags["pin-cushion"].tooltipCustomDescription,
            fontSize: this.fontSize,
            maxWidth: this.maxWidth,
        };
    }
    async _renderHTML() {
        const dane = await this.getData();
        if(dane.flags){
        try {
            const html = await renderTemplate("modules/pin-cushion/templates/hud-content.hbs", {
                contentTooltip: this.contentTooltip,
                title: this.HUDtitle, img: this.data.document.flags["pin-cushion"].showImageExplicitSource
            });
            return html;
        } catch (e) {
            console.error("_renderHTML error:", e);
            throw e;
        }
    }
    }

    async _replaceHTML(result, html) {
        if(this.flags){
            html.innerHTML = result;
        }
    }

    setPosition() {
        const { x, y } = this.object;

        // Konwersja pozycji świata na pozycję na ekranie (screen coordinates)
        const screenPos = canvas.stage.worldTransform.apply({ x, y });

        // Pozycja absolutna względem widoku
        const pos = {
            position: "absolute",
            left: `${screenPos.x + 20}px`,
            top: `${screenPos.y + 20}px`,
            "font-size": `${this.fontSize}px`,
            "max-width": `${this.maxWidth}px`,
            "pointer-events": "none", // jeśli HUD ma być tylko informacyjny
        };
        if (this.element instanceof jQuery) {
            this.element.css(pos);
        } else if (this.element instanceof HTMLElement) {
            Object.assign(this.element.style, pos);
        }
    }

    async render(force = false, options = {}) {
        await super.render(force, options);
        const el = this.element;
        const header = el.querySelector("header.window-header");
        if (header) header.remove();
        const menu = el.querySelector("menu.controls-dropdown");
        if (menu) menu.remove();
        const contentSection = el.querySelector("section.window-content");
        if (contentSection) {
            contentSection.style.padding = "0px";
        }
    }
    static async renderTemplate(path, data) {
        if (game.release.generation > 12) {
            return foundry.applications.handlebars.renderTemplate(path, data);
        } else {
            return renderTemplate(path, data);
        }
    }
}
