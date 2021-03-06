
/* auto */ import { VpcVal, VpcValBool, VpcValN, VpcValS } from './../../vpc/vpcutils/vpcVal';
/* auto */ import { VpcPanelScriptEditor } from './vpcScriptEditor';
/* auto */ import { VpcEditPanels } from './vpcPanelsInterface';
/* auto */ import { VpcStateInterface } from './../state/vpcInterface';
/* auto */ import { VpcElType, checkThrowNotifyMsg, vpcElTypeToString } from './../../vpc/vpcutils/vpcEnums';
/* auto */ import { VpcElBase } from './../../vpc/vel/velBase';
/* auto */ import { O } from './../../ui512/utils/util512Base';
/* auto */ import { Util512, cast } from './../../ui512/utils/util512';
/* auto */ import { TextSelModify } from './../../ui512/textedit/ui512TextSelModify';
/* auto */ import { UI512ElTextFieldAsGeneric } from './../../ui512/textedit/ui512GenericField';
/* auto */ import { FormattedText } from './../../ui512/draw/ui512FormattedText';
/* auto */ import { UI512ElTextField, UI512FldStyle } from './../../ui512/elements/ui512ElementTextField';
/* auto */ import { UI512ElLabel } from './../../ui512/elements/ui512ElementLabel';
/* auto */ import { UI512BtnStyle } from './../../ui512/elements/ui512ElementButton';
/* auto */ import { UI512Application } from './../../ui512/elements/ui512ElementApp';
/* auto */ import { TextFontSpec } from './../../ui512/draw/ui512DrawTextClasses';
/* auto */ import { UI512DrawText } from './../../ui512/draw/ui512DrawText';
/* auto */ import { UI512CompBase } from './../../ui512/composites/ui512Composites';
/* auto */ import { lng } from './../../ui512/lang/langBase';

/* (c) 2019 moltenform(Ben Fisher) */
/* Released under the GPLv3 license */

/**
 * base class for property panels,
 * for example, editing button and field properties
 */
export abstract class VpcEditPanelsBase extends UI512CompBase implements VpcEditPanels {
    vci: VpcStateInterface;
    isExclusive = false;
    compositeType = 'VpcEditPanelsBase';
    readonly firstSectionH = 100;
    readonly secondSectionH = 162;
    readonly thirdSectionH = 100;
    protected static numeric: { [key: string]: boolean } = { icon: true };
    topInputs: [string, string, number][] = [];

    leftChoices: [string, string][] = [];
    readonly leftChoicesX = 20;
    readonly leftChoicesW = 130;
    readonly leftChoicesH = 117;
    readonly rightOptionsX = 216;
    rightOptions: [string, string][] = [];
    abstract readonly velType: VpcElType;
    cbGetAndValidateSelectedVel: (prp: string) => O<VpcElBase>;
    lblNamingTip: UI512ElLabel;

    /**
     * helpful text in the lower left, by default showing how to refer to object in a script
     */
    protected refreshTip(name: string, id: string) {
        let shortName = vpcElTypeToString(this.velType, true);
        let longName = vpcElTypeToString(this.velType, false);
        let s = lng('lngRefer to this %typ in a script as');
        s = s.replace(/%typ/g, longName);
        s += `\n${shortName} id ${id}`;
        if (name.length) {
            s += `\nor\n${shortName} "${name}"`;
        }

        s = UI512DrawText.setFont(s, new TextFontSpec('monaco', 0, 9).toSpecString());
        this.lblNamingTip.set('labeltext', s);
    }

    /**
     * initialize layout
     */
    createSpecific(app: UI512Application) {
        Util512.freezeProperty(this, 'topInputs');
        Util512.freezeProperty(this, 'leftChoices');
        Util512.freezeProperty(this, 'rightOptions');

        /* draw a 1px border around the panel */
        let grp = app.getGroup(this.grpId);
        let bg = this.genBtn(app, grp, 'bg');
        bg.set('autohighlight', false);
        bg.setDimensions(this.x, this.y, this.logicalWidth, this.logicalHeight);
        this.createTopInputs(app);
        this.createLeftChoices(app);
        this.createRightOptions(app);
        this.createLowerSection(app);
    }

    /**
     * draw top inputs, usually to get name of vel
     */
    createTopInputs(app: UI512Application) {
        const lblX = 16;
        const inputX = 170;
        const inputH = 22;
        const inputMargin = 11;
        let totalUsedH = this.topInputs.length * inputH + (this.topInputs.length - 1) * inputMargin;
        let startY = this.y + Math.floor((this.firstSectionH - totalUsedH) / 2);
        let curY = startY;
        let grp = app.getGroup(this.grpId);
        for (let [lblTxt, inId, inputW] of this.topInputs) {
            let lbl = this.genChild<UI512ElLabel>(app, grp, `lbl##${inId}`, UI512ElLabel);
            lbl.set('labeltext', lng(lblTxt));
            lbl.set('labelhalign', false);
            lbl.set('labelvalign', true);
            lbl.setDimensions(this.x + lblX, curY, inputX - lblX, inputH);

            let inp = this.genChild<UI512ElTextField>(app, grp, `inp##${inId}`, UI512ElTextField);
            inp.set('multiline', false);
            inp.set('labelwrap', false);
            inp.set('nudgey', 2);
            inp.setDimensions(this.x + inputX, curY, inputW, inputH);
            curY += inputH + inputMargin;
        }
    }

    /**
     * draw left choicebox, usually to get style of vel
     */
    createLeftChoices(app: UI512Application) {
        if (!this.leftChoices.length) {
            return;
        }

        let grp = app.getGroup(this.grpId);
        let startY = this.y + this.firstSectionH + Math.floor((this.secondSectionH - this.leftChoicesH) / 2);
        let fld = this.genChild<UI512ElTextField>(app, grp, `leftchoice`, UI512ElTextField);
        fld.set('scrollbar', true);
        fld.set('selectbylines', true);
        fld.set('multiline', true);
        fld.set('canselecttext', true);
        fld.set('canedit', false);
        fld.set('labelwrap', false);
        UI512ElTextField.setListChoices(
            fld,
            this.leftChoices.map(item => lng(item[0]))
        );
        fld.setDimensions(this.x + this.leftChoicesX, startY, this.leftChoicesW, this.leftChoicesH);
    }

    /**
     * draw right options, usually to set boolean options of vel
     */
    createRightOptions(app: UI512Application) {
        const inputH = 15;
        const inputMargin = 3;
        let totalUsedH = this.rightOptions.length * inputH + (this.rightOptions.length - 1) * inputMargin;
        let startY = this.y + this.firstSectionH + Math.floor((this.secondSectionH - totalUsedH) / 2);
        let curY = startY;
        let grp = app.getGroup(this.grpId);
        for (let [lblTxt, inId] of this.rightOptions) {
            let inp = this.genBtn(app, grp, `toggle##${inId}`);
            inp.set('style', UI512BtnStyle.Checkbox);
            inp.set('labeltext', lng(lblTxt));
            inp.set('labelhalign', false);
            inp.set('labelvalign', true);
            inp.setDimensions(this.x + this.rightOptionsX, curY, this.logicalWidth - this.rightOptionsX, inputH);
            curY += inputH + inputMargin;
        }
    }

    /**
     * initialize layout for lower part of panel
     */
    createLowerSection(app: UI512Application) {
        let tipsX = this.leftChoicesX + 0;
        let tipsY = this.firstSectionH + this.secondSectionH - 9;
        let grp = app.getGroup(this.grpId);
        this.lblNamingTip = this.genChild<UI512ElLabel>(app, grp, `lbl##tip`, UI512ElLabel);
        this.lblNamingTip.set('labelhalign', false);
        this.lblNamingTip.set('labelvalign', false);
        this.lblNamingTip.setDimensions(this.x + tipsX, this.y + tipsY, this.logicalWidth - tipsX, this.logicalHeight - tipsY);

        const spaceFromRight = 55;
        const spaceFromBottom = 17;
        const btnW = 68;
        const btnH = 23;
        let isEmpty = this.compositeType === 'VpcEditPanelsEmpty';
        let scriptBtn = this.genBtn(app, grp, isEmpty ? 'btnGenPart' : 'btnScript');
        scriptBtn.set('labeltext', lng('lngScript...'));
        scriptBtn.set('style', UI512BtnStyle.OSStandard);
        scriptBtn.setDimensions(
            this.x + this.logicalWidth - (btnW + spaceFromRight),
            this.y + this.logicalHeight - (btnH + spaceFromBottom),
            btnW,
            btnH
        );

        if (isEmpty) {
            scriptBtn.setDimensions(scriptBtn.x - 75, scriptBtn.y, scriptBtn.w + 75, scriptBtn.h);
        }
    }

    /**
     * refresh ui
     */
    refreshFromModel(app: UI512Application) {
        let vel = this.cbGetAndValidateSelectedVel('selectedVelId');
        if (!vel) {
            return;
        }

        let currentCardId = this.vci.getOptionS('currentCardId');
        this.fillInValuesTip(app, vel);
        let grp = app.getGroup(this.grpId);
        for (let lblTxtPts of this.topInputs) {
            let inId = lblTxtPts[1];
            let el = grp.getEl(this.getElId(`inp##${inId}`));
            if (inId === 'fldcontent') {
                el.set('style', UI512FldStyle.Transparent);
                el.set('canedit', false);
                el.set('canselecttext', false);
                el.set('h', 50);
                el.set('x', grp.getEl(this.getElId(`inp##name`)).x - 3);
                el.setFmTxt(FormattedText.newFromUnformatted('To edit text, use the Browse\ntool and click on the field.'));
            } else {
                let s = VpcEditPanelsBase.numeric[inId] ? vel.getN(inId).toString() : vel.getS(inId);
                el.setFmTxt(FormattedText.newFromUnformatted(s));
            }
        }

        if (this.leftChoices.length) {
            let styl = vel.getProp('style', currentCardId).readAsString();
            let el = grp.getEl(this.getElId(`leftchoice`));
            let found = this.leftChoices.findIndex(item => item[1].toLowerCase() === styl.toLowerCase());
            if (found !== -1) {
                let wasScroll = el.getN('scrollamt');
                let gel = new UI512ElTextFieldAsGeneric(cast(UI512ElTextField, el));
                TextSelModify.selectLineInField(gel, found);
                el.set('scrollamt', wasScroll);
            } else {
                el.set('selcaret', 0);
                el.set('selend', 0);
            }
        }

        for (let lblTxtPts of this.rightOptions) {
            let inId = lblTxtPts[1];
            let el = grp.getEl(this.getElId(`toggle##${inId}`));
            let val = vel.getProp(inId, currentCardId);
            el.set('checkmark', val.readAsStrictBoolean());
        }
    }

    /**
     * refresh the tip saying how to refer to an object in a script
     */
    fillInValuesTip(app: UI512Application, vel: VpcElBase) {
        this.refreshTip(vel.getS('name'), vel.id);
    }

    /**
     * save changes for one property
     */
    protected saveChangesToModelSetProp(vel: VpcElBase, propName: string, newVal: VpcVal, onlyCheckIfDirty: boolean) {
        let currentCardId = this.vci.getOptionS('currentCardId');
        if (onlyCheckIfDirty) {
            let current = propName === 'name' ? VpcValS(vel.getS('name')) : vel.getProp(propName, currentCardId);
            if (current.readAsString() !== newVal.readAsString()) {
                checkThrowNotifyMsg(false, VpcPanelScriptEditor.thereArePendingChanges);
            }
        } else {
            vel.setProp(propName, newVal, currentCardId);
        }
    }

    /**
     * save changes for all properties
     * if onlyCheckIfDirty is set, skip saving anything and only check if there are unsaved changes
     */
    saveChangesToModel(app: UI512Application, onlyCheckIfDirty: boolean) {
        let vel = this.cbGetAndValidateSelectedVel('selectedVelId');
        if (!vel) {
            return;
        }

        let grp = app.getGroup(this.grpId);
        let elIcon = grp.findEl(this.getElId(`inp##icon`));
        if (elIcon && vel.getType() === VpcElType.Btn && !onlyCheckIfDirty) {
            let typed = elIcon.getFmTxt().toUnformatted();
            let n = Util512.parseInt(typed);
            let nextIcon = Math.max(0, n ?? 0);
            let curIcon = vel.getN('icon') ?? 0;
            if (nextIcon === 0 && curIcon !== 0) {
                /* if you are adding/removing a button's icon, set font as appropriate */
                vel.set('textfont', 'chicago');
                vel.set('textstyle', 0);
                vel.set('textsize', 12);
            } else if (nextIcon !== 0 && curIcon === 0) {
                /* if you are adding/removing a button's icon, set font as appropriate */
                vel.set('textfont', 'geneva');
                vel.set('textstyle', 0);
                vel.set('textsize', 9);
            }
        }

        for (let lblTxtPts of this.topInputs) {
            let inId = lblTxtPts[1];
            if (inId === 'fldcontent') {
                continue;
            }

            let el = grp.getEl(this.getElId(`inp##${inId}`));
            let typed = el.getFmTxt().toUnformatted();
            if (VpcEditPanelsBase.numeric[inId]) {
                let n = Util512.parseInt(typed);
                n = Math.max(0, n ?? 0);
                this.saveChangesToModelSetProp(vel, inId, VpcValN(n), onlyCheckIfDirty);
            } else {
                this.saveChangesToModelSetProp(vel, inId, VpcValS(typed), onlyCheckIfDirty);
            }
        }

        if (this.leftChoices.length) {
            let el = grp.getEl(this.getElId(`leftchoice`));
            let gel = new UI512ElTextFieldAsGeneric(cast(UI512ElTextField, el));
            let ln = TextSelModify.selectByLinesWhichLine(gel);
            if (ln !== undefined && ln >= 0 && ln < this.leftChoices.length) {
                this.saveChangesToModelSetProp(vel, 'style', VpcValS(this.leftChoices[ln][1]), onlyCheckIfDirty);
            }
        }

        for (let lblTxtParts of this.rightOptions) {
            let inId = lblTxtParts[1];
            let el = grp.getEl(this.getElId(`toggle##${inId}`));
            let checked = el.getB('checkmark');
            vel.setProp(inId, VpcValBool(checked), this.vci.getOptionS('currentCardId'));
            this.saveChangesToModelSetProp(vel, inId, VpcValBool(checked), onlyCheckIfDirty);
        }
    }

    /**
     * e.g. certain properties only apply to bg items
     */
    showOrHideBgSpecific(app: UI512Application, isBgPart: boolean) {
        if (this.velType === VpcElType.Btn) {
            this.showOrHideBgSpecificImpl(app, 'sharedhilite', 200, isBgPart);
        } else if (this.velType === VpcElType.Fld) {
            this.showOrHideBgSpecificImpl(app, 'sharedtext', 180, isBgPart);
        }
    }

    /**
     * e.g. certain properties only apply to bg items
     */
    protected showOrHideBgSpecificImpl(app: UI512Application, prop: string, basey: number, isBgPart: boolean) {
        let grp = app.getGroup(this.grpId);
        let chkbox = grp.getEl(this.getElId('toggle##' + prop));
        const inputH = 15;
        const inputMargin = 3;
        if (isBgPart) {
            chkbox.set('visible', true);
            basey -= Math.round((inputH + inputMargin) / 2);
        } else {
            chkbox.set('visible', false);
        }

        let curY = basey;
        for (let lblTxtParts of this.rightOptions) {
            let inId = lblTxtParts[1];
            let inp = grp.getEl(this.getElId(`toggle##${inId}`));
            inp.setDimensions(inp.x, curY, inp.w, inp.h);
            curY += inputH + inputMargin;
        }
    }
}
