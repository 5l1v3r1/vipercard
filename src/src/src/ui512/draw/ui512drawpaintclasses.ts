
/* auto */ import { O, assertTrueWarn, makeUI512Error } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { LockableArr } from '../../ui512/utils/utilsUI512.js';
/* auto */ import { RectUtils } from '../../ui512/utils/utilsDraw.js';
/* auto */ import { UI512BasePainterUtils } from '../../ui512/draw/ui512drawpattern.js';

/* tslint:disable:no-unbound-method */

export abstract class UI512Painter extends UI512BasePainterUtils {
    abstract setPixel(x: number, y: number, color: number): void;
    abstract fillRect(x: number, y: number, w: number, h: number, color: number): void;
    abstract readPixel(x: number, y: number): number;
    abstract readPixelSupported(): boolean;
    abstract getCanvasWidth(): number;
    abstract getCanvasHeight(): number;
    abstract getBackingSurface(): any;
    abstract getSurfaceName(): string;
    abstract supportsPatterns(): boolean;

    // "pencil" tool
    higherSmearPixels(xpts: LockableArr<number>, ypts: LockableArr<number>, colorparam: number) {
        let realSetPixel = this.setPixel;
        this.smearShapes(xpts, ypts, colorparam, (x: number, y: number, color: number) => {
            realSetPixel(x, y, color);
        });
    }

    // "square brush" or "eraser" tool
    higherSmearRectangle(
        xpts: LockableArr<number>,
        ypts: LockableArr<number>,
        colorparam: number,
        diameterx: number,
        diametery: number
    ) {
        let realFillRect = this.fillRect;
        this.smearShapes(xpts, ypts, colorparam, (x: number, y: number, color: number) => {
            realFillRect(x - Math.floor(diameterx / 2), y - Math.floor(diametery / 2), diameterx, diametery, color);
        });
    }

    // "brush" tool
    higherSmearSmallBrush(xpts: LockableArr<number>, ypts: LockableArr<number>, colorparam: number) {
        let realFillRect = this.fillRect;
        this.smearShapes(xpts, ypts, colorparam, (x: number, y: number, color: number) => {
            // central 4x2 rectangle
            realFillRect(x - 1, y, 4, 2, color);
            // first smaller 2x1 rectangle
            realFillRect(x, y - 1, 2, 1, color);
            // second smaller 2x1 rectangle
            realFillRect(x, y + 2, 2, 1, color);
        });
    }

    // "spraycan" tool
    higherSmearSpraycan(xpts: LockableArr<number>, ypts: LockableArr<number>, colorparam: number) {
        let realSetPixel = this.setPixel;
        this.smearShapes(xpts, ypts, colorparam, (x: number, y: number, color: number) => {
            realSetPixel(x + -1, y + -8, color);
            realSetPixel(x + 3, y + -7, color);
            realSetPixel(x + -6, y + -6, color);
            realSetPixel(x + 0, y + -6, color);
            realSetPixel(x + -3, y + -5, color);
            realSetPixel(x + 2, y + -4, color);
            realSetPixel(x + 6, y + -4, color);
            realSetPixel(x + -8, y + -3, color);
            realSetPixel(x + -2, y + -3, color);
            realSetPixel(x + -5, y + -2, color);
            realSetPixel(x + 1, y + -2, color);
            realSetPixel(x + 4, y + -2, color);
            realSetPixel(x + -1, y + -1, color);
            realSetPixel(x + 7, y + -1, color);
            realSetPixel(x + -3, y + 0, color);
            realSetPixel(x + 1, y + 0, color);
            realSetPixel(x + -8, y + 1, color);
            realSetPixel(x + -5, y + 1, color);
            realSetPixel(x + 4, y + 1, color);
            realSetPixel(x + -2, y + 2, color);
            realSetPixel(x + 2, y + 2, color);
            realSetPixel(x + 6, y + 2, color);
            realSetPixel(x + -4, y + 3, color);
            realSetPixel(x + -7, y + 4, color);
            realSetPixel(x + -1, y + 4, color);
            realSetPixel(x + 2, y + 4, color);
            realSetPixel(x + 5, y + 5, color);
            realSetPixel(x + -4, y + 6, color);
            realSetPixel(x + 0, y + 7, color);
        });
    }

    protected smearShapes(
        xpts: LockableArr<number>,
        ypts: LockableArr<number>,
        color: number,
        newSetPixel: (x: number, y: number, color: number) => void
    ) {
        let realSetPixel = this.setPixel;
        let realFillRect = this.fillRect;
        try {
            this.fillRect = () => {
                throw makeUI512Error("shouldn't be called");
            };
            this.setPixel = newSetPixel;
            if (xpts.len() === 1 && ypts.len() === 1) {
                // plot one point
                this.plotLine(xpts.at(0), ypts.at(0), xpts.at(0), ypts.at(0), color);
            } else {
                // unconnected polygon
                for (let i = 0; i < xpts.len() - 1; i++) {
                    this.plotLine(xpts.at(i), ypts.at(i), xpts.at(i + 1), ypts.at(i + 1), color);
                }
            }
        } finally {
            this.setPixel = realSetPixel;
            this.fillRect = realFillRect;
        }
    }

    /*
    drawing thicker lines used to be done by drawing the shape x times in a diagonal line from x-linesize/2 to x+linesize/2.
    drawing an elipse can be done by drawing n ellipses from furthest out inwards, which works
    this new way works better than all of them though.
    */

    protected canAdjustLineSize(
        fillcolor: O<number>,
        linesize: number,
        fn: (fill: O<number>, ofx: number, ofy: number) => void
    ) {
        fn(fillcolor, 0, 0);
        if (linesize > 1) {
            // draw lots of transparent ones to make the border bigger
            fn(undefined, 0, 1);
            fn(undefined, 0, -1);
            fn(undefined, 1, 0);
            fn(undefined, -1, 0);
        }
    }

    higherStraightLine(x0: number, y0: number, x1in: number, y1in: number, color: number, linesize: number) {
        let w = x1in - x0;
        let h = y1in - y0;
        return this.canAdjustLineSize(0, linesize, (fillcolorinput: O<number>, ofx: number, ofy: number) => {
            let x1 = x0 + ofx + w;
            let y1 = y0 + ofy + h;
            this.plotLine(x0 + ofx, y0 + ofy, x1, y1, color);
        });
    }

    higherRoundRect(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        color: number,
        fillcolor: O<number>,
        linesize: number
    ) {
        let w = x1 - x0;
        let h = y1 - y0;
        return this.canAdjustLineSize(fillcolor, linesize, (fillcolorinput: O<number>, ofx: number, ofy: number) => {
            this.drawvpcroundrectPorted(x0 + ofx, y0 + ofy, w, h, color, fillcolorinput);
        });
    }

    higherRectangle(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        color: number,
        fillcolor: O<number>,
        linesize: number
    ) {
        let w = x1 - x0;
        let h = y1 - y0;
        return this.canAdjustLineSize(fillcolor, linesize, (fillcolorinput: O<number>, ofx: number, ofy: number) => {
            this.drawboxthinborderPorted(x0 + ofx, y0 + ofy, w, h, color, fillcolorinput);
        });
    }

    higherCurve(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: number,
        linesize: number
    ) {
        return this.canAdjustLineSize(0, linesize, (fillcolorinput: O<number>, ofx: number, ofy: number) => {
            this.plotQuadBezier(x0 + ofx, y0 + ofy, x1 + ofx, y1 + ofy, x2 + ofx, y2 + ofy, color);
        });
    }

    higherPlotEllipse(
        xm: number,
        ym: number,
        x1: number,
        y1: number,
        color: number,
        fillcolor: O<number>,
        linesize: number
    ) {
        let w = x1 - xm;
        let h = y1 - ym;
        let centerx = xm + Math.floor(w / 2);
        let centery = ym + Math.floor(h / 2);
        let a = Math.floor(w / 2);
        let b = Math.floor(h / 2);

        return this.canAdjustLineSize(fillcolor, linesize, (fillcolorinput: O<number>, ofx: number, ofy: number) => {
            this.plotEllipseAxis(centerx + ofx, centery + ofy, a, b, color, fillcolorinput);
        });
    }

    floodFill(xinput: number, yinput: number, color: number) {
        throw makeUI512Error('not implemented');
    }

    protected floodFillWithoutPattern(
        xinput: number,
        yinput: number,
        tmpColor: number,
        recordOutputX?: number[],
        recordOutputY?: number[]
    ) {
        // from Jared Updike, http://stackoverflow.com/questions/1257117/does-anyone-have-a-working-non-recursive-floodfill-algorithm-written-in-c
        // modified by Ben Fisher, lb_drawing.h from fastpixelpic
        const w = this.getCanvasWidth();
        const h = this.getCanvasHeight();
        if (!RectUtils.hasPoint(xinput, yinput, 0, 0, w, h)) {
            return 0;
        }

        let qx: number[] = [];
        let qy: number[] = [];

        const targetColor = this.readPixel(xinput, yinput);
        if (targetColor === tmpColor) {
            // no work needed
            return 0;
        }

        qx.push(xinput);
        qy.push(yinput);
        let countPixelsWritten = 0;
        let maxallowediters = 1000 * w * h;
        let counter = 0;
        while (qx.length > 0) {
            counter += 1;
            if (counter > maxallowediters) {
                assertTrueWarn(false, `39|exceeded maxallowediters ${counter}`);
                return countPixelsWritten;
            }

            let x = qx.pop() as number;
            let y = qy.pop() as number;
            if (RectUtils.hasPoint(x, y, 0, 0, w, h) && this.readPixel(x, y) === targetColor) {
                countPixelsWritten += 1;
                this.setPixel(x, y, tmpColor);
                if (recordOutputX) {
                    (recordOutputX as any).push(x);
                    (recordOutputY as any).push(y);
                }

                qx.push(x + 1);
                qy.push(y);
                qx.push(x - 1);
                qy.push(y);
                qx.push(x);
                qy.push(y + 1);
                qx.push(x);
                qy.push(y - 1);
            }
        }

        return countPixelsWritten;
    }

    /*
    * Bresenham Curve Rasterizing Algorithms
    Used with explicit permission, e-mail on Oct 27 2017
    * @author  Zingl Alois
    * @date    17.12.2014
    * @version 1.3
    * @url     http://members.chello.at/easyfilter/bresenham.html
    */
    plotLine(x0: number, y0: number, x1: number, y1: number, color: number) {
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        let dx = Math.abs(x1 - x0);
        let sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0);
        let sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        let e2; /* error value e_xy */

        for (;;) {
            /* loop */
            this.setPixel(x0, y0, color);
            if (x0 === x1 && y0 === y1) {
                break;
            }

            e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            } /* x step */
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            } /* y step */
        }
    }

    plotEllipse(xm: number, ym: number, w: number, h: number, color: number, fillcolor: O<number>) {
        this.plotEllipseAxis(
            xm + Math.floor(w / 2),
            ym + Math.floor(h / 2),
            Math.floor(w / 2),
            Math.floor(h / 2),
            color,
            fillcolor
        );
    }

    protected plotEllipseAxis(xm: number, ym: number, a: number, b: number, color: number, fillcolor: O<number>) {
        xm = Math.floor(xm);
        ym = Math.floor(ym);
        a = Math.floor(a);
        b = Math.floor(b);
        let x = -a;
        let y = 0; /* II. quadrant from bottom left to top right */
        let e2;
        let dx = (1 + 2 * x) * b * b; /* error increment  */
        let dy = x * x;
        let err = dx + dy; /* error of 1.step */

        do {
            this.fillRectMightBeClear(
                xm - Math.abs(x),
                ym - Math.abs(y),
                Math.abs(x) * 2 + 1,
                Math.abs(y) * 2 + 1,
                fillcolor
            );
            this.setPixel(xm - x, ym + y, color); /*   I. Quadrant */
            this.setPixel(xm + x, ym + y, color); /*  II. Quadrant */
            this.setPixel(xm + x, ym - y, color); /* III. Quadrant */
            this.setPixel(xm - x, ym - y, color); /*  IV. Quadrant */
            e2 = 2 * err;
            if (e2 >= dx) {
                x++;
                err += dx += 2 * b * b;
            } /* x step */
            if (e2 <= dy) {
                y++;
                err += dy += 2 * a * a;
            } /* y step */
        } while (x <= 0);

        while (y++ < b) {
            /* too early stop for flat ellipses with a=1, */
            this.fillRectMightBeClear(xm, ym - Math.abs(y), 1, Math.abs(y) * 2, fillcolor);
            this.setPixel(xm, ym - y, color); /* -> finish tip of ellipse */
            this.setPixel(xm, ym + y, color);
        }
    }

    plotCircle(xm: number, ym: number, r: number, color: number, fillcolor: number) {
        xm = Math.floor(xm);
        ym = Math.floor(ym);
        r = Math.floor(r);
        let x = -r;
        let y = 0;
        let err = 2 - 2 * r; /* bottom left to top right */
        do {
            this.setPixel(xm - x, ym + y, color); /*   I. Quadrant +x +y */
            this.setPixel(xm - y, ym - x, color); /*  II. Quadrant -x +y */
            this.setPixel(xm + x, ym - y, color); /* III. Quadrant -x -y */
            this.setPixel(xm + y, ym + x, color); /*  IV. Quadrant +x -y */
            r = err;
            if (r <= y) {
                err += ++y * 2 + 1; /* y step */
            }

            if (r > x || err > y) {
                err += ++x * 2 + 1; /* x step */
            }
        } while (x < 0);
    }

    plotQuadBezierSeg(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) {
        /* plot a limited quadratic Bezier segment */

        let sx = x2 - x1;
        let sy = y2 - y1;
        let xx = x0 - x1;
        let yy = y0 - y1;
        let xy; /* relative values for checks */
        let dx;
        let dy;
        let err;
        let cur = xx * sy - yy * sx; /* curvature */

        if (!(xx * sx <= 0 && yy * sy <= 0)) {
            console.error('38|sign of gradient must not change');
            return;
        }

        if (sx * sx + sy * sy > xx * xx + yy * yy) {
            /* begin with shorter part */
            x2 = x0;
            x0 = sx + x1;
            y2 = y0;
            y0 = sy + y1;
            cur = -cur; /* swap P0 P2 */
        }
        if (cur !== 0) {
            /* no straight line */
            xx += sx;
            xx *= sx = x0 < x2 ? 1 : -1; /* x step direction */
            yy += sy;
            yy *= sy = y0 < y2 ? 1 : -1; /* y step direction */
            xy = 2 * xx * yy;
            xx *= xx;
            yy *= yy; /* differences 2nd degree */
            if (cur * sx * sy < 0) {
                /* negated curvature? */
                xx = -xx;
                yy = -yy;
                xy = -xy;
                cur = -cur;
            }
            dx = 4.0 * sy * cur * (x1 - x0) + xx - xy; /* differences 1st degree */
            dy = 4.0 * sx * cur * (y0 - y1) + yy - xy;
            xx += xx;
            yy += yy;
            err = dx + dy + xy; /* error 1st step */
            do {
                this.setPixel(x0, y0, color); /* plot curve */
                if (x0 === x2 && y0 === y2) {
                    return; /* last pixel -> curve finished */
                }

                y1 = 2 * err < dx ? 1 : 0; /* save value for test of y step */
                if (2 * err > dy) {
                    x0 += sx;
                    dx -= xy;
                    err += dy += yy;
                } /* x step */
                if (y1) {
                    y0 += sy;
                    dy -= xy;
                    err += dx += xx;
                } /* y step */
            } while (dy < 0 && dx > 0); /* gradient negates -> algorithm fails */
        }

        this.plotLine(x0, y0, x2, y2, color); /* plot remaining part to end */
    }

    plotQuadBezier(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) {
        /* plot any quadratic Bezier curve */
        let x = x0 - x1;
        let y = y0 - y1;
        let t = x0 - 2 * x1 + x2;
        let r;

        if (x * (x2 - x1) > 0) {
            /* horizontal cut at P4? */
            if (y * (y2 - y1) > 0) {
                if (Math.abs((y0 - 2 * y1 + y2) / t * x) > Math.abs(y)) {
                    /* vertical cut at P6 too? */
                    /* which first? */
                    x0 = x2;
                    x2 = x + x1;
                    y0 = y2;
                    y2 = y + y1; /* swap points */
                } /* now horizontal cut at P4 comes first */
            }

            t = (x0 - x1) / t;
            r = (1 - t) * ((1 - t) * y0 + 2.0 * t * y1) + t * t * y2; /* By(t=P4) */
            t = (x0 * x2 - x1 * x1) * t / (x0 - x1); /* gradient dP4/dx=0 */
            x = Math.floor(t + 0.5);
            y = Math.floor(r + 0.5);
            r = (y1 - y0) * (t - x0) / (x1 - x0) + y0; /* intersect P3 | P0 P1 */
            this.plotQuadBezierSeg(x0, y0, x, Math.floor(r + 0.5), x, y, color);
            r = (y1 - y2) * (t - x2) / (x1 - x2) + y2; /* intersect P4 | P1 P2 */
            x0 = x1 = x;
            y0 = y;
            y1 = Math.floor(r + 0.5); /* P0 = P4, P1 = P8 */
        }
        if ((y0 - y1) * (y2 - y1) > 0) {
            /* vertical cut at P6? */
            t = y0 - 2 * y1 + y2;
            t = (y0 - y1) / t;
            r = (1 - t) * ((1 - t) * x0 + 2.0 * t * x1) + t * t * x2; /* Bx(t=P6) */
            t = (y0 * y2 - y1 * y1) * t / (y0 - y1); /* gradient dP6/dy=0 */
            x = Math.floor(r + 0.5);
            y = Math.floor(t + 0.5);
            r = (x1 - x0) * (t - y0) / (y1 - y0) + x0; /* intersect P6 | P0 P1 */
            this.plotQuadBezierSeg(x0, y0, Math.floor(r + 0.5), y, x, y, color);
            r = (x1 - x2) * (t - y2) / (y1 - y2) + x2; /* intersect P7 | P1 P2 */
            x0 = x;
            x1 = Math.floor(r + 0.5);
            y0 = y1 = y; /* P0 = P6, P1 = P7 */
        }
        this.plotQuadBezierSeg(x0, y0, x1, y1, x2, y2, color); /* remaining part */
    }
}
