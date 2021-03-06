
/* auto */ import { ShapeToolState, VpcAppUIToolShape } from './vpcToolShape';
/* auto */ import { VpcTool } from './../../vpc/vpcutils/vpcEnums';
/* auto */ import { CanvasWrapper } from './../../ui512/utils/utilsCanvasDraw';

/* (c) 2019 moltenform(Ben Fisher) */
/* Released under the GPLv3 license */

/**
 * the curve tool.
 * in original product, acted like the pencil tool but if in a filled mode,
 * it would fill the interior.
 * for us we draw a bezier.
 */
export class VpcAppUIToolCurve extends VpcAppUIToolShape {
    /**
     * draw one bezier curve
     */
    protected drawPartial(cv: CanvasWrapper, st: ShapeToolState, tl: VpcTool, x: number, y: number) {
        /* for now, have a simplified curve tool that can only start with horizontal lines. */
        /* used to have a full two-stage tool, but people were confused by the interface. */
        let startX = Math.round(cv.canvas.width / 3);
        let endx = Math.round((2 * cv.canvas.width) / 3);
        this.cbPaintRender().drawPartialShape(
            [startX, x, endx],
            [Math.round(cv.canvas.height / 2), y, Math.round(cv.canvas.height / 2)],
            st.elStage,
            st.paStage
        );
    }
}
