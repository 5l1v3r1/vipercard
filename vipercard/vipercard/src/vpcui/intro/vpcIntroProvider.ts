
/* auto */ import { CountNumericIdNormal } from './../../vpc/vpcutils/vpcUtils';
/* auto */ import { UndoManager } from './../state/vpcUndo';
/* auto */ import { VpcStateSerialize } from './../state/vpcStateSerialize';
/* auto */ import { VpcRuntime, VpcState } from './../state/vpcState';
/* auto */ import { VpcSession, vpcStacksGetData } from './../../vpc/request/vpcRequest';
/* auto */ import { VpcPresenterEvents } from './../presentation/vpcPresenterEvents';
/* auto */ import { VpcPresenter } from './../presentation/vpcPresenter';
/* auto */ import { VpcOutsideImpl } from './../state/vpcOutsideImpl';
/* auto */ import { VpcStateInterfaceImpl } from './vpcInterfaceImpl';
/* auto */ import { VpcNonModalFormSendReport } from './../nonmodaldialogs/vpcFormSendReport';
/* auto */ import { VpcNonModalFormLogin } from './../nonmodaldialogs/vpcFormLogin';
/* auto */ import { VpcTool } from './../../vpc/vpcutils/vpcEnums';
/* auto */ import { UndoableActionCreateOrDelVel } from './../state/vpcCreateOrDelVel';
/* auto */ import { VpcElStack, VpcElStackLineageEntry } from './../../vpc/vel/velStack';
/* auto */ import { VpcModelTop } from './../../vpc/vel/velModelTop';
/* auto */ import { Util512Higher, getRoot } from './../../ui512/utils/util512Higher';
/* auto */ import { assertTrue, assertTrueWarn, bool, checkThrow } from './../../ui512/utils/util512Assert';
/* auto */ import { assertEqWarn, longstr, slength } from './../../ui512/utils/util512';
/* auto */ import { UI512Presenter } from './../../ui512/presentation/ui512Presenter';
/* auto */ import { ElementObserverNoOp } from './../../ui512/elements/ui512ElementGettable';
/* auto */ import { lng } from './../../ui512/lang/langBase';

/**
 * download, construct, and initialize a ViperCard project
 */
export class VpcIntroProvider {
    cbExitToMainMenu: () => void;
    cbExitToNewDocument: () => void;
    cbExitToOpen: (mineOnly: boolean) => void;
    constructor(
        public identifier: string,
        public readonly docName: string,
        public readonly loc: VpcDocumentLocation
    ) {}

    /**
     * begin async operation
     */
    startLoadDocument(currentCntrl: UI512Presenter, cbSetStatus: (s: string) => void) {
        Util512Higher.syncToAsyncTransition(
            () => this.startLoadDocumentAsync(currentCntrl, cbSetStatus),
            'startLoadDocument'
        );
    }

    /**
     * loads the document, showing a message on the "loading" page
     * if an error occurs. we'll show the exception details.
     */
    async startLoadDocumentAsync(
        currentCntrl: UI512Presenter,
        cbSetStatus: (s: string) => void
    ) {
        try {
            await this.startLoadDocumentAsyncImpl(currentCntrl);
        } catch (e) {
            cbSetStatus(
                lng(
                    'lngPlease go to \nhttps://www.vipercard.net/0.3/\nto return to the main menu.'
                ) +
                    '\n' +
                    e.message +
                    '\n\n\n'
            );
        }
    }

    /**
     * load the document
     */
    async loadDocumentTop(): Promise<[VpcPresenter, VpcState]> {
        /* download the stack data */
        let serialized = await this.getSerializedStackData();

        /* create pr and fullVci */
        let { pr, fullVci, vpcState, idGen } = await this.getVpcState();

        /* load saved data */
        await this.initPrUI(pr, serialized, fullVci, vpcState, idGen);

        /* compile scripts, set stack lineage */
        try {
            /* don't prevent stack from opening if a failure happens here */
            await this.initPrSettings(pr, vpcState, fullVci);
        } catch (e) {
            assertTrueWarn(false, 'initPrSettings', e.toString());
        }

        /* setup the redirection-to-login-form if requested */
        this.setFirstActionUponLoad(vpcState, pr);

        /* return the results */
        return [pr, vpcState];
    }

    /**
     * download stack data
     */
    protected async getSerializedStackData() {
        let serializedSavedData = '';
        if (
            this.loc === VpcDocumentLocation.NewDoc ||
            this.loc === VpcDocumentLocation.ShowLoginForm
        ) {
            /* no serialized data needed */
            assertEqWarn('', this.identifier, 'KL|');
        } else if (this.loc === VpcDocumentLocation.FromStaticDemo) {
            /* request json asynchronously */
            assertTrue(!this.identifier.includes('/'), 'KK|');
            assertTrue(!this.identifier.includes('\\'), 'KJ|');
            assertTrue(!this.identifier.includes('..'), 'KI|');
            assertTrue(this.identifier.endsWith('.json'), 'KH|');
            let got = await Util512Higher.asyncBeginLoadJson(
                '/resources/docs/' + this.identifier
            );
            serializedSavedData = JSON.stringify(got);
        } else if (this.loc === VpcDocumentLocation.FromJsonFile) {
            /* we already have the json, it was given to us via identifier */
            serializedSavedData = this.identifier;
        } else if (this.loc === VpcDocumentLocation.FromStackIdOnline) {
            /* ask the server for the data */
            let got = await vpcStacksGetData(this.identifier);
            serializedSavedData = got.stackdata;
        } else {
            checkThrow(false, 'KG|cannot open from location ' + this.loc);
        }

        checkThrow(
            this.loc === VpcDocumentLocation.NewDoc ||
                this.loc === VpcDocumentLocation.ShowLoginForm ||
                slength(serializedSavedData),
            'KF|serializedSavedData is ' + serializedSavedData
        );

        return serializedSavedData;
    }

    /**
     * construct a full VpcState
     */
    async getVpcState() {
        await this.yieldTime();
        let vpcState = new VpcState();
        await this.yieldTime();
        vpcState.runtime = new VpcRuntime();
        await this.yieldTime();
        vpcState.undoManager = new UndoManager(() =>
            vpcState.model.productOpts.getS('currentCardId')
        );
        await this.yieldTime();
        vpcState.runtime.opts.observer = new ElementObserverNoOp();
        await this.yieldTime();
        vpcState.runtime.outside = new VpcOutsideImpl();
        await this.yieldTime();
        let idGen = new CountNumericIdNormal(VpcElStack.initIncreasingNumberId);
        await this.yieldTime();
        let NoteThisIsDisabledCode = 1;
        //~ vpcState.runtime.codeExec = new VpcExecTop(idGen, vpcState.runtime.outside);
        //~ await this.yieldTime();
        vpcState.model = new VpcModelTop();
        await this.yieldTime();
        let fullVci = new VpcStateInterfaceImpl();
        let pr = new VpcPresenter(fullVci, vpcState.runtime);
        fullVci.init(vpcState, pr);
        vpcState.vci = fullVci;
        await this.yieldTime();
        if (this.loc === VpcDocumentLocation.FromStaticDemo) {
            pr.cameFromDemoSoNeverPromptSave = this.identifier.replace(/\.json/g, '');
            await this.yieldTime();
        }

        pr.cbExitToMainMenu = this.cbExitToMainMenu;
        await this.yieldTime();
        pr.cbExitToNewDocument = this.cbExitToNewDocument;
        await this.yieldTime();
        pr.cbExitToOpen = this.cbExitToOpen;
        await this.yieldTime();
        pr.initPresenter(vpcState.undoManager);
        await this.yieldTime();
        return { pr, fullVci, vpcState, idGen };
    }

    protected async initPrUI(
        pr: VpcPresenter,
        serializedSavedData: string,
        fullVci: VpcStateInterfaceImpl,
        vpcState: VpcState,
        idGen: CountNumericIdNormal
    ) {
        /* load saved data */
        if (serializedSavedData.length) {
            UndoableActionCreateOrDelVel.ensureModelNotEmpty(fullVci, false);
            await this.yieldTime();
            let serVel = JSON.parse(serializedSavedData);
            await this.yieldTime();
            let des = new VpcStateSerialize();
            await this.yieldTime();
            des.deserializeAll(fullVci, serVel);
            await this.yieldTime();
        } else {
            /* only call this *after* the presenter has set up useThisObserverForVpcEls */
            vpcState.model.uuid = Util512Higher.weakUuid();
            await this.yieldTime();
            UndoableActionCreateOrDelVel.ensureModelNotEmpty(fullVci, true);
            await this.yieldTime();
        }

        vpcState.model.stack.increasingnumber = idGen;
        await this.yieldTime();
        pr.initUI();
        await this.yieldTime();
        vpcState.runtime.outside.vci = pr.vci;
        await this.yieldTime();

        /* go to the first card (but don't send opencard yet) */
        fullVci.doWithoutAbilityToUndo(() => {
            let card = vpcState.model.stack.bgs[0].cards[0].id;
            pr.setCurCardNoOpenCardEvt(card);
        });
    }

    /**
     * compile scripts, set stack lineage
     */
    protected async initPrSettings(
        pr: VpcPresenter,
        vci: VpcState,
        fullVci: VpcStateInterfaceImpl
    ) {
        /* create a new stack lineage */
        if (!vci.model.stack.getS('stacklineage').length) {
            fullVci.doWithoutAbilityToUndo(() => {
                let en = new VpcElStackLineageEntry(
                    vci.model.stack.lineageUsernameNull(),
                    VpcSession.generateStackPartialId(),
                    'untitled'
                );

                vci.model.stack.appendToStackLineage(en);
            });
        }

        /* set current tool */
        let hasContent =
            vci.model.stack.bgs[0] &&
            vci.model.stack.bgs[0].cards[0] &&
            bool(vci.model.stack.bgs[0].cards[0].parts[0]);

        if (
            this.identifier === 'demo_graphics.json' ||
            this.identifier === 'demo_game.json' ||
            this.identifier === 'demo_anim.json'
        ) {
            hasContent = false;
        }

        vci.vci.doWithoutAbilityToUndo(() => {
            vci.vci.setTool(hasContent ? VpcTool.Browse : VpcTool.Pencil);
            if (hasContent) {
                VpcPresenterEvents.sendInitialOpenStackAndOpenCard(pr, vci.vci);
            }
        });

        vci.vci.causeUIRedraw();
        await this.yieldTime();
    }

    /**
     * by placing a callback in the queue, this code will be run
     * as soon as the page opens
     */
    protected setFirstActionUponLoad(vpcState: VpcState, pr: VpcPresenter) {
        if (this.loc === VpcDocumentLocation.ShowLoginForm) {
            /* tell the presenter to show the login form as soon as the page opens */
            pr.lyrCoverArea.setMyMessage('');
            pr.placeCallbackInQueue(() => {
                let form = new VpcNonModalFormLogin(vpcState.vci, false /*newUserOk*/);
                form.fnCbWhenSignedIn = () => {
                    pr.menuActions.save.beginGoExit('openFromMyStacks');
                };

                VpcNonModalFormSendReport.largeWindowBounds(form, vpcState.vci);
                vpcState.vci.setNonModalDialog(form);
            });
        } else if (this.loc === VpcDocumentLocation.FromStackIdOnline) {
            /* tell the presenter to show a dialog explaining that this is someone else's stack */
            pr.placeCallbackInQueue(() => {
                try {
                    let ses = VpcSession.fromRoot();
                    let username = ses ? ses.username : '';
                    let info = vpcState.vci.getModel().stack.getLatestStackLineage();
                    if (info.stackOwner !== username) {
                        pr.answerMsg(
                            longstr(`You're opening a stack created by
                                "${info.stackOwner}".{{NEWLINE}}If you want
                                to make changes, simply press Save, and you'll
                                be working on your own copy of the stack.`)
                        );
                    }
                } catch (e) {
                    console.error('could not show message, ' + e);
                }
            });
        }
    }

    /**
     * load the document, and pause for a bit
     */
    protected async startLoadDocumentAsyncImpl(currentCntrl: UI512Presenter) {
        /* minimum time, just so that it "feels right" rather than loading instantly */
        const minimumTime = 1500;
        let began = performance.now();

        let [pr, vpcState] = await this.loadDocumentTop();
        if (this.loc !== VpcDocumentLocation.ShowLoginForm) {
            let elapsed = performance.now() - began;
            if (elapsed < minimumTime) {
                /* we loaded too fast... slow it down intentionally */
                await Util512Higher.sleep(minimumTime - elapsed);
            }
        }

        currentCntrl.placeCallbackInQueue(() => {
            /* remove the loading page and replace it with the new presenter */
            getRoot().replaceCurrentPresenter(pr);
        });
    }

    /**
     * provide time for event loop
     * probably the time it is the most useful is
     * if the stack has thousands of scripts to process
     */
    protected async yieldTime() {
        await Util512Higher.sleep(1);
    }
}

/**
 * which location to open from
 */
export enum VpcDocumentLocation {
    __isUI512Enum = 1,
    NewDoc,
    FromStaticDemo,
    FromJsonFile,
    FromStackIdOnline,
    ShowLoginForm
}