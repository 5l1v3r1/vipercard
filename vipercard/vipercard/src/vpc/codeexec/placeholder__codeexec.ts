
export class VpcExecTop {
    forceStopRunning() {}
    isCodeRunning(): boolean {
        return false;
    }

    scheduleCodeExec(...args: any[]) {}
    lastEncounteredScriptErr: any;
}

export class VpcExecFrameStack {}

export class VpcExecFrame {
    static filterTemporaryFromScript(script: string) {
        return script;
    }
    static filterTemporaryFromAllScripts(...args: any[]) {}
    static appendTemporaryDynamicCodeToScript(...args: any[]) {
        return '';
    }
}
