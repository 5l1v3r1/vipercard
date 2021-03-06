
/* auto */ import { VpcVal, VpcValN, VpcValS } from './../../vpc/vpcutils/vpcVal';
/* auto */ import { LogToReplMsgBox, ReadableContainer, VpcScriptMessage, WritableContainer } from './../../vpc/vpcutils/vpcUtils';
/* auto */ import { VpcExecFrameStack } from './../../vpc/codeexec/vpcScriptExecFrameStack';
/* auto */ import { VpcExecFrame } from './../../vpc/codeexec/vpcScriptExecFrame';
/* auto */ import { RequestedContainerRef, RequestedVelRef } from './../../vpc/vpcutils/vpcRequestedReference';
/* auto */ import { VpcStateInterface } from './vpcInterface';
/* auto */ import { PropAdjective, VpcChunkPreposition, VpcElType, VpcTool, checkThrow, toolToDispatchShapes } from './../../vpc/vpcutils/vpcEnums';
/* auto */ import { ChunkResolution, RequestedChunk } from './../../vpc/vpcutils/vpcChunkResolution';
/* auto */ import { CheckReservedWords } from './../../vpc/codepreparse/vpcCheckReserved';
/* auto */ import { VpcBuiltinFunctionsDateUtils } from './../../vpc/codepreparse/vpcBuiltinFunctionsUtils';
/* auto */ import { VpcBuiltinFunctions } from './../../vpc/codepreparse/vpcBuiltinFunctions';
/* auto */ import { VpcElStack } from './../../vpc/vel/velStack';
/* auto */ import { VelResolveReference } from './../../vpc/vel/velResolveReference';
/* auto */ import { VelResolveId, VelResolveName, VelResolveNumber } from './../../vpc/vel/velResolveName';
/* auto */ import { ReadableContainerField, ReadableContainerVar, WritableContainerField, WritableContainerVar } from './../../vpc/vel/velResolveContainer';
/* auto */ import { VpcElProductOpts } from './../../vpc/vel/velProductOpts';
/* auto */ import { OutsideWorldRead, OutsideWorldReadWrite } from './../../vpc/vel/velOutsideInterfaces';
/* auto */ import { VpcModelTop } from './../../vpc/vel/velModelTop';
/* auto */ import { VpcElField } from './../../vpc/vel/velField';
/* auto */ import { VpcElCard } from './../../vpc/vel/velCard';
/* auto */ import { VpcElBg } from './../../vpc/vel/velBg';
/* auto */ import { VpcElBase, VpcElSizable } from './../../vpc/vel/velBase';
/* auto */ import { ModifierKeys } from './../../ui512/utils/utilsKeypressHelpers';
/* auto */ import { O, bool } from './../../ui512/utils/util512Base';
/* auto */ import { assertTrue, ensureDefined } from './../../ui512/utils/util512Assert';
/* auto */ import { Util512, assertEq, longstr, slength } from './../../ui512/utils/util512';
/* auto */ import { ElementObserverVal } from './../../ui512/elements/ui512ElementGettable';
/* auto */ import { UI512PaintDispatch } from './../../ui512/draw/ui512DrawPaintDispatch';

/* (c) 2019 moltenform(Ben Fisher) */
/* Released under the GPLv3 license */

/**
 * OutsideWorldReadWrite
 * provides scripts with access to the outside "world".
 */
export class VpcOutsideImpl implements OutsideWorldReadWrite {
    protected readonly check = new CheckReservedWords();
    readonly builtinFns: VpcBuiltinFunctions;
    vci: VpcStateInterface;
    constructor() {
        this.builtinFns = new VpcBuiltinFunctions(this as OutsideWorldRead);
    }

    /**
     * create a vel and add it to the model
     */
    CreatePart(type: VpcElType, x: number, y: number, w: number, h: number) {
        let currentCardId = this.GetOptionS('currentCardId');
        let el = this.vci.createVel(currentCardId, type, -1) as VpcElSizable;
        assertTrue(el instanceof VpcElSizable, '6u|not VpcElSizable');
        el.setDimensions(x, y, w, h);
        return el;
    }

    /**
     * create a card and add it to the model
     */
    CreateCard(indexRelativeToBg: number) {
        let currentCardId = this.GetOptionS('currentCardId');
        let currentCard = this.vci.getModel().getCardById(currentCardId);
        return this.vci.createVel(currentCard.parentId, VpcElType.Card, indexRelativeToBg);
    }

    /**
     * remove a vel from the model
     */
    RemovePart(vel: VpcElBase) {
        this.vci.removeVel(vel);
    }

    /**
     * remove a card
     */
    RemoveCard(vel: VpcElBase) {
        this.vci.removeVel(vel);
    }

    /**
     * resolve reference to a vel
     */
    ResolveVelRef(ref: RequestedVelRef): [O<VpcElBase>, VpcElCard] {
        let frame = this.vci.findExecFrameStack()[1];
        let me: O<VpcElBase> = this.FindVelById(frame?.meId);
        let target = this.vci.getModel().findByIdUntyped(frame?.message?.targetId);
        let cardHistory = this.vci.getCodeExec().cardHistory;

        let resolver = new VelResolveReference(this.vci.getModel());
        let ret: [O<VpcElBase>, VpcElCard];
        try {
            /* for convenience, let's throw exceptions when
            the vel can't be found. means we get less specific messages, though */
            ret = resolver.go(ref, me, target, cardHistory);
        } catch (e) {
            let as = e?.typeName?.includes('Vpc');
            if (as) {
                ret = [undefined, this.vci.getModel().getCurrentCard()];
            } else {
                throw e;
            }
        }

        checkThrow(ret && ret.length === 2, 'UL|VelResolveReference invalid return');
        let firstElem = ret[0];
        checkThrow(
            !firstElem || !firstElem.getS('name').includes('$$'),
            `Kt|names with $$ are reserved for internal ViperCard objects.`
        );

        return ret;
    }

    /**
     * try resolving a RequestedVelRef, if succeeds return its long id
     * if resolution fails, return undefined
     */
    ElementExists(vel: RequestedVelRef): O<string> {
        let found = this.ResolveVelRef(vel);
        if (found[0]) {
            return new VelResolveId(this.vci.getModel()).go(found[0], PropAdjective.Long);
        } else {
            return undefined;
        }
    }

    /**
     * count the number of elements of a certain type
     */
    CountElements(type: VpcElType, parentRef: RequestedVelRef): number {
        let countOnlyMarked = false;
        if (parentRef.type === VpcElType.Stack && parentRef.cardLookAtMarkedOnly) {
            countOnlyMarked = true;
            parentRef.cardLookAtMarkedOnly = false;
        }

        let parent = ensureDefined(this.ResolveVelRef(parentRef)[0], '6t|Cannot find this object.');
        let parentAsCard = parent as VpcElCard;
        let parentAsBg = parent as VpcElBg;
        let parentAsStack = parent as VpcElStack;
        if (type === VpcElType.Product) {
            return 1;
        } else if (type === VpcElType.Stack) {
            return 1;
        } else if (type === VpcElType.Bg && parentAsStack instanceof VpcElStack) {
            return parentAsStack.bgs.length;
        } else if (type === VpcElType.Card && parentAsStack instanceof VpcElStack) {
            if (countOnlyMarked) {
                return parentAsStack.bgs.map(bg => bg.cards.filter(c => c.getB('marked')).length).reduce(Util512.add);
            } else {
                return parentAsStack.bgs.map(bg => bg.cards.length).reduce(Util512.add);
            }
        } else if (type === VpcElType.Card && parentAsBg instanceof VpcElBg) {
            return parentAsBg.cards.length;
        } else if ((type === VpcElType.Btn || type === VpcElType.Fld) && parentAsBg instanceof VpcElBg) {
            return parentAsBg.parts.filter(ch => ch.getType() === type).length;
        } else if ((type === VpcElType.Btn || type === VpcElType.Fld) && parentAsCard instanceof VpcElCard) {
            return parentAsCard.parts.filter(ch => ch.getType() === type).length;
        } else {
            checkThrow(false, `6s|cannot count types ${type} parent of type ${parent.getType()} ${parent.id}`);
        }
    }

    /**
     * get the current "item delemiter" to know how to interpret 'get item 3 of "a,b,c"'
     */
    GetItemDelim() {
        let ret = this.GetOptionS('itemDel');
        assertEq(1, ret.length, '6r|invalid itemDel', ret);
        return ret;
    }

    /**
     * declare a global
     */
    DeclareGlobal(varName: string) {
        assertTrue(slength(varName), '6q|bad varName', varName);
        let frame = this.getExecFrameStack()[1];
        frame.declaredGlobals[varName] = true;
    }

    /**
     * is a variable defined
     */
    IsVarDefined(varName: string) {
        let [frStack, frame] = this.getExecFrameStack();
        return (
            bool(frStack.constants.find(varName)) ||
            bool(frame.declaredGlobals[varName] && frStack.globals.find(varName)) ||
            bool(frame.locals.find(varName))
        );
    }

    /**
     * read variable contents
     */
    ReadVarContents(varName: string): VpcVal {
        assertTrue(slength(varName), '6p|bad varName', varName);

        let [frStack, frame] = this.getExecFrameStack();
        let found = frStack.constants.find(varName);
        if (found) {
            return found;
        }

        found = frStack.globals.find(varName);
        if (found && frame.declaredGlobals[varName] !== undefined) {
            return found;
        }

        found = frame.locals.find(varName);
        return ensureDefined(
            found,
            '6o|no variable found with this name. please put contents into before reading from it.',
            varName
        );
    }

    /**
     * set variable contents
     */
    SetVarContents(varName: string, v: VpcVal): void {
        assertTrue(slength(varName), '6n|bad varName', varName);

        if (varName === LogToReplMsgBox.redirectThisVariableToMsgBox) {
            this.WriteToReplMessageBox(v.readAsString(), false);
            return;
        }

        let [frStack, frame] = this.getExecFrameStack();
        let found = frStack.constants.find(varName);
        if (found) {
            checkThrow(false, `6m|name not allowed ${varName}, it is a constant`);
        }

        checkThrow(this.check.okLocalVar(varName), '8>|variable name not allowed', varName);
        if (frame.declaredGlobals[varName] !== undefined) {
            frStack.globals.set(varName, v);
        } else {
            frame.locals.set(varName, v);
        }
    }

    /**
     * set variable contents (allows access to special vars like "it")
     */
    SetSpecialVar(varName: string, v: VpcVal): void {
        checkThrow(varName === 'it', '8=|only supported for it');
        let frame = this.getExecFrameStack()[1];
        frame.locals.set(varName, v);
    }

    /**
     * resolve a reference to a container,
     * throws if the requested vel does not exist
     */
    ResolveContainerReadable(container: RequestedContainerRef): ReadableContainer {
        checkThrow(container instanceof RequestedContainerRef, '8<|not a valid container');
        if (container.vel) {
            let resolved = this.ResolveVelRef(container.vel);
            let vel = resolved[0];
            checkThrow(vel instanceof VpcElBase, `UK|element not found`);
            checkThrow(
                vel instanceof VpcElField,
                longstr(`6[|currently we only support reading text from a
                    fld. to read label of button, use 'the label of cd btn 1'`)
            );
            return new ReadableContainerField(vel, resolved[1].id);
        } else if (container.variable) {
            return new ReadableContainerVar(this as OutsideWorldRead, container.variable);
        } else {
            checkThrow(false, `6l|invalid IntermedValContainer, nothing set`);
        }
    }

    /**
     * resolve reference to writable container
     * throws if the requested vel does not exist
     */
    ResolveContainerWritable(container: RequestedContainerRef): WritableContainer {
        if (container.vel) {
            let resolved = this.ResolveVelRef(container.vel);
            let vel = resolved[0];
            checkThrow(vel, `8;|element not found`);
            checkThrow(
                vel instanceof VpcElField,
                longstr(`UJ|currently we only support writing text to
                    a fld. to write label of button, use 'the label of cd btn 1'`)
            );

            return new WritableContainerField(vel, resolved[1].id);
        } else if (container.variable) {
            return new WritableContainerVar(this, container.variable);
        } else {
            checkThrow(false, `6k|invalid IntermedValContainer, nothing set`);
        }
    }

    /**
     * read text from a container
     */
    ContainerRead(contRef: RequestedContainerRef): string {
        let cont = this.ResolveContainerReadable(contRef);
        return ChunkResolution.applyRead(cont, contRef.chunk, this.GetItemDelim());
    }

    /**
     * write to a container
     */
    ContainerWrite(contRef: RequestedContainerRef, newContent: string, prep: VpcChunkPreposition) {
        let cont = this.ResolveContainerWritable(contRef);
        return ChunkResolution.applyPut(cont, contRef.chunk, this.GetItemDelim(), newContent, prep);
    }

    /**
     * modify a container
     */
    ContainerModify(contRef: RequestedContainerRef, fn: (s: string) => string) {
        let cont = this.ResolveContainerWritable(contRef);
        return ChunkResolution.applyModify(cont, contRef.chunk, this.GetItemDelim(), fn);
    }

    /**
     * get the focused vel
     */
    GetSelectedField(): O<VpcElField> {
        return this.vci.getCurrentFocusVelField();
    }

    /**
     * set a property
     */
    SetProp(ref: O<RequestedVelRef>, prop: string, v: VpcVal, chunk: O<RequestedChunk>): void {
        let resolved: [O<VpcElBase>, VpcElCard];
        if (ref) {
            resolved = this.ResolveVelRef(ref);
        } else {
            resolved = [this.vci.getModel().productOpts, this.vci.getModel().getCurrentCard()];
        }

        if (!resolved[0]) {
            checkThrow(false, `8/|could not set ${prop}, could not find that object.`);
        }

        let vel = resolved[0];
        let cardId = resolved[1].id;
        if (chunk) {
            let fld = vel as VpcElField;
            checkThrow(fld instanceof VpcElField, `8.|can only say 'set the (prop) of char 1 to 2' on fields.`);
            fld.specialSetPropChunk(cardId, prop, chunk, v, this.GetItemDelim());
        } else {
            vel.setProp(prop, v, cardId);
        }
    }

    /**
     * high-level get property of a vel, returns VpcVal
     */
    GetProp(ref: O<RequestedVelRef>, prop: string, adjective: PropAdjective, chunk: O<RequestedChunk>): VpcVal {
        let resolved: [O<VpcElBase>, VpcElCard];
        if (ref) {
            resolved = this.ResolveVelRef(ref);
        } else {
            resolved = [this.vci.getModel().productOpts, this.vci.getModel().getCurrentCard()];
        }

        if (!resolved[0]) {
            checkThrow(false, `8-|could not get ${prop}, could not find that object.`);
        }

        let vel = resolved[0];
        let cardId = resolved[1].id;
        let resolver = new VelResolveName(this.vci.getModel());
        /* handled here are the cases where "adjective" matters */
        if (chunk) {
            /* put the textstyle of char 2 to 4 of fld "myFld" into x */
            let fld = vel as VpcElField;
            checkThrow(fld instanceof VpcElField, `8,|can only say 'get the (prop) of char 1 to 2' on fields.`);
            return fld.specialGetPropChunk(cardId, prop, chunk, this.GetItemDelim());
        } else if (prop === 'name') {
            /* put the long name of card "myCard" into x */
            adjective = adjective === PropAdjective.Empty ? PropAdjective.Abbrev : adjective;
            return VpcValS(resolver.go(vel, adjective));
        } else if (prop === 'id') {
            /* put the id of card "myCard" into x */
            let resolveId = new VelResolveId(this.vci.getModel());
            adjective = adjective === PropAdjective.Empty ? PropAdjective.Abbrev : adjective;
            return VpcValS(resolveId.go(vel, adjective));
        } else if (prop === 'number') {
            /* put the number of card "myCard" into x */
            let resolveNum = new VelResolveNumber(this.vci.getModel());
            return VpcValN(resolveNum.go(vel));
        } else if (prop === 'owner') {
            /* put the owner of cd btn 1 into x */
            checkThrow(ref, "UI|must say 'get the owner of cd btn 1' and not 'get the owner'");
            return VpcValS(this.getOwnerFullString(resolved, adjective));
        } else if (prop === 'target') {
            /* put the long target into x */
            checkThrow(
                !ref || ref.type === VpcElType.Product,
                "UH|must say 'get the target' and not 'get the target of cd btn 1'"
            );
            return VpcValS(this.getTargetFullString(adjective));
        } else if (prop === 'date') {
            /* put the long date into x */
            checkThrow(!ref || ref.type === VpcElType.Product, "UG|must say 'get the date' and not 'get the date of cd btn 1'");
            return VpcBuiltinFunctionsDateUtils.go(adjective);
        } else if (prop === 'version') {
            /* get the long version */
            checkThrow(!ref || ref.type === VpcElType.Product, "8+|must say 'get the date' and not 'get the date of cd btn 1'");
            return VpcBuiltinFunctionsDateUtils.getVersion(adjective);
        } else {
            if (adjective !== PropAdjective.Empty) {
                checkThrow(
                    false,
                    longstr(`6j|this property does not take an
                        adjective like 'long' (the long name of cd btn 1)`)
                );
            }

            /* ask the vel for the property */
            return vel.getProp(prop, cardId);
        }
    }

    /**
     * get the model
     */
    Model(): VpcModelTop {
        return this.vci.getModel();
    }

    /**
     * is this a runtime property on the 'product' object, or a special pseudoproperty?
     */
    IsProductProp(propName: string): boolean {
        return (
            VpcElProductOpts.canGetProductProp(propName) || propName === 'target' || propName === 'date' || propName === 'version'
        );
    }

    /**
     * get the current tool, specify the 'real' tool or the 'simulated' tool chosen by a script
     */
    GetCurrentTool(realOrMimic: boolean): VpcTool {
        return this.GetOptionN(realOrMimic ? 'currentTool' : 'mimicCurrentTool');
    }

    /**
     * is this a built-in function
     */
    IsBuiltinFunction(s: string): boolean {
        return VpcBuiltinFunctions.isFunction(s);
    }

    /**
     * call a built-in function
     */
    CallBuiltinFunction(s: string, args: VpcVal[]): VpcVal {
        return this.builtinFns.call(s, args);
    }

    /**
     * get the current card id
     */
    GetCurrentCardId(): string {
        return this.vci.getOptionS('currentCardId');
    }

    /**
     * get code execution frame information
     */
    GetFrameInfo(): [VpcScriptMessage, VpcVal[]] {
        let frame = this.getExecFrameStack()[1];
        return [frame.message, frame.args];
    }

    /**
     * get a runtime (non-persisted) string value
     */
    GetOptionS(prop: string): string {
        return this.vci.getOptionS(prop);
    }

    /**
     * get a runtime (non-persisted) numeric value
     */
    GetOptionN(prop: string): number {
        return this.vci.getOptionN(prop);
    }

    /**
     * get a runtime (non-persisted) boolean value
     */
    GetOptionB(prop: string): boolean {
        return this.vci.getOptionB(prop);
    }

    /**
     * set a runtime (non-persisted) value
     */
    SetOption<T extends ElementObserverVal>(prop: string, newVal: T) {
        this.vci.setOption(prop, newVal);
    }

    /**
     * find element by id
     */
    FindVelById(id: O<string>): O<VpcElBase> {
        return this.vci.getModel().findByIdUntyped(id);
    }

    /**
     * go straight to a card without calling closecard or opencard
     */
    SetCurCardNoOpenCardEvt(id: string) {
        this.vci.setCurCardNoOpenCardEvt(id);
    }

    /**
     * draw paint on the screen by simulating a click
     */
    SimulateClick(argsGiven: number[], mods: ModifierKeys): void {
        let mimcTool = this.GetCurrentTool(false);
        checkThrow(
            mimcTool !== VpcTool.Browse,
            longstr(
                `7R|please first run something like 'choose
        "pencil" tool' to specify which tool to draw with`,
                ''
            )
        );
        let args = this.MakeUI512PaintDispatchFromCurrentOptions(false, mods);
        for (let i = 0; i < argsGiven.length; i += 2) {
            args.xPts.push(argsGiven[i]);
            args.yPts.push(argsGiven[i + 1]);
        }

        let frStack = this.getExecFrameStack()[0];
        frStack.paintQueue.push(args);
    }

    /**
     * commit simulated clicks to the screen
     */
    CommitSimulatedClicks(queue: UI512PaintDispatch[]): void {
        this.vci.commitSimulatedClicks(queue);
    }

    /**
     * make a UI512PaintDispatch object
     */
    MakeUI512PaintDispatchFromCurrentOptions(realOrMimic: boolean, mods: ModifierKeys) {
        let tool = this.GetCurrentTool(realOrMimic);
        let fromOptsPattern = this.GetOptionS('currentPattern');
        let fromOptsFillcolor = this.GetOptionN('optPaintFillColor');
        let fromOptsLineColor = this.GetOptionN('optPaintLineColor');
        let fromOptsWide = this.GetOptionB('optWideLines');
        let ret = UI512PaintDispatch.fromMemoryOpts(
            toolToDispatchShapes(tool),
            tool === VpcTool.Eraser,
            fromOptsPattern,
            fromOptsFillcolor,
            fromOptsLineColor,
            fromOptsWide
        );

        ret.cardId = this.GetOptionS('currentCardId');
        ret.mods = mods;
        return ret;
    }

    /**
     * append text to the message box
     * ignored if the message box is not currently open
     */
    WriteToReplMessageBox(s: string, returnFocus: boolean): void {
        return this.vci.writeToReplMessageBox(s, returnFocus);
    }

    /**
     * get access to FieldsRecentlyEdited, used to determine
     * whether we should call openField or exitField
     */
    GetFieldsRecentlyEdited() {
        return this.vci.getCodeExec().fieldsRecentlyEdited;
    }

    /**
     * put the target into x (the vel that was interacted with)
     */
    protected getTargetFullString(adjective: PropAdjective): string {
        /* get a longer form of the id unless specifically said "short" */
        let frame = this.vci.findExecFrameStack()[1];
        let target = this.vci.getModel().findByIdUntyped(frame?.message?.targetId);
        checkThrow(target, 'UF|the target was not found');
        if (adjective === PropAdjective.Short) {
            return target.getS('name') ?? '';
        } else {
            return new VelResolveId(this.vci.getModel()).go(target, PropAdjective.Long);
        }
    }

    /**
     * put the owner of cd btn 1 into x, it returns a string, that can then be used as an object
     */
    protected getOwnerFullString(resolved: [O<VpcElBase>, VpcElCard], adjective: PropAdjective) {
        /* get a longer form of the id unless specifically said "short" */
        checkThrow(resolved[0], 'UE|the object was not found');
        if (resolved[0].getType() === VpcElType.Stack || resolved[0].getType() === VpcElType.Product) {
            checkThrow(false, 'UD|Cannot get owner of this type of object.');
        }

        let owner = this.vci.getModel().getOwnerUntyped(resolved[0]);
        if (adjective === PropAdjective.Short) {
            return owner.getS('name') ?? '';
        } else {
            return new VelResolveId(this.vci.getModel()).go(owner, PropAdjective.Long);
        }
    }

    /**
     * get the current code execution frame
     */
    protected getExecFrameStack(): [VpcExecFrameStack, VpcExecFrame] {
        let [frStack, frame] = this.vci.findExecFrameStack();
        if (frStack && frame) {
            return [frStack, frame];
        } else {
            assertTrue(false, '6h|could not find execution frame');
        }
    }
}
