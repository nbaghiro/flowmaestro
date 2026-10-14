import React from "react";

type Point = [number, number];

interface StarProps {
    at: Point;
    bright?: boolean;
    index: number;
}

const Star: React.FC<StarProps> = ({ at: [x, y], bright, index }) => (
    <g>
        {bright && <circle className="glow" cx={x} cy={y} r={7} />}
        <circle
            className="st"
            cx={x}
            cy={y}
            r={bright ? 2.6 : 1.8}
            style={{
                animationDelay: `${-((index * 0.37) % 3.4)}s`,
                animationDuration: `${2.6 + (index % 4) * 0.5}s`
            }}
        />
    </g>
);

const Link: React.FC<{ a: Point; b: Point; index: number }> = ({ a, b, index }) => (
    <line
        className="ln"
        pathLength={1}
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        style={{ animationDelay: `${index * 0.07}s` }}
    />
);

const Stroke: React.FC<{ d: string; soft?: boolean; delay?: number }> = ({
    d,
    soft,
    delay = 0
}) => (
    <path
        className={soft ? "sil soft" : "sil"}
        pathLength={1}
        d={d}
        style={{ animationDelay: `${0.2 + delay}s` }}
    />
);

/* ------------------------------------------------------------------------------------ */
/* The maestro: three-quarter view turned toward the dancer, mid-stride, baton arm high, */
/* the other hand open in front. Swept-back mane, tailcoat trailing, patent shoes.        */
/* ------------------------------------------------------------------------------------ */

const M = {
    handR: [273, 100] as Point,
    elbowR: [236, 142] as Point,
    shoulderR: [208, 178] as Point,
    neck: [178, 160] as Point,
    shoulderL: [128, 194] as Point,
    elbowL: [184, 236] as Point,
    handL: [244, 252] as Point,
    chest: [174, 222] as Point,
    waist: [174, 266] as Point,
    hipL: [146, 300] as Point,
    hipR: [192, 296] as Point,
    tailL: [76, 406] as Point,
    tailR: [210, 380] as Point,
    kneeL: [136, 404] as Point,
    kneeR: [212, 404] as Point,
    footL: [104, 520] as Point,
    footR: [248, 520] as Point
};

const MAESTRO_LINKS: Array<[Point, Point]> = [
    [M.shoulderR, M.neck],
    [M.neck, M.shoulderL],
    [M.neck, M.chest],
    [M.chest, M.waist],
    [M.waist, M.hipL],
    [M.waist, M.hipR],
    [M.shoulderR, M.tailR],
    [M.tailR, M.hipR],
    [M.hipL, M.kneeL],
    [M.kneeL, M.footL],
    [M.hipR, M.kneeR],
    [M.kneeR, M.footR]
];

const Maestro: React.FC = () => (
    <svg
        className="cst cst-l"
        viewBox="0 0 320 560"
        role="img"
        aria-label="A conductor in a tailcoat, drawn as a constellation, turned toward the dancer and beating time with a baton"
    >
        <g className="fig breathe">
            {/* head, turned to the right */}
            <Stroke d="M158 92 C 174 84, 196 90, 202 110 C 206 124, 206 138, 200 148 C 197 153, 186 156, 172 155 C 164 154, 160 148, 158 138 C 155 126, 154 104, 158 92 Z" />
            <Stroke d="M202 118 C 209 123, 208 130, 201 134" soft delay={0.3} />
            <Stroke d="M188 112 L201 110" soft delay={0.4} />
            <Stroke d="M192 142 L199 141" soft delay={0.4} />

            {/* short hair, swept back */}
            <Stroke d="M156 100 C 158 86, 176 82, 192 88 C 200 92, 204 100, 204 108" delay={0.2} />
            <Stroke d="M184 86 C 194 82, 202 86, 206 96" soft delay={0.3} />
            <Stroke d="M162 92 C 170 86, 180 86, 188 90" soft delay={0.4} />
            <Stroke d="M156 112 C 152 124, 154 138, 160 146" soft delay={0.3} />
            <Stroke d="M161 122 L161 136" soft delay={0.4} />
            {/* neck, collar, bow tie */}
            <Stroke d="M168 154 L166 172" delay={0.3} />
            <Stroke d="M194 150 L196 168" delay={0.3} />
            <Stroke d="M160 174 L178 184 L198 170" delay={0.4} />
            <Stroke d="M168 178 L178 184 L188 176 L186 171 L170 173 Z" soft delay={0.5} />
            {/* tailcoat */}
            <Stroke
                d="M128 194 C 140 184, 160 180, 178 180 C 194 178, 204 178, 208 178"
                delay={0.5}
            />
            <Stroke d="M208 178 C 214 220, 212 256, 204 290" delay={0.5} />
            <Stroke d="M128 194 C 122 232, 122 262, 128 292" delay={0.5} />
            <Stroke d="M176 180 C 154 198, 146 230, 154 264" delay={0.6} />
            <Stroke d="M180 180 C 202 198, 208 230, 198 264" delay={0.6} />
            <Stroke d="M154 264 C 164 274, 188 274, 198 264" delay={0.7} />
            <Stroke d="M176 180 L176 262" soft delay={0.7} />
            <Stroke d="M174 210 L174 212 M174 226 L174 228 M174 242 L174 244" soft delay={0.8} />
            <g className="tails">
                <Stroke d="M128 292 C 112 330, 92 370, 76 406" delay={0.8} />
                <Stroke d="M156 296 C 142 334, 126 372, 112 404" delay={0.8} />
                <Stroke d="M76 406 C 88 402, 100 404, 112 404" delay={0.9} />
                <Stroke d="M146 300 C 132 336, 116 372, 100 404" soft delay={0.9} />
                <Link a={M.shoulderL} b={M.tailL} index={12} />
                <Link a={M.tailL} b={M.hipL} index={13} />
                <Star at={M.tailL} index={9} />
            </g>
            <Stroke d="M204 290 C 208 326, 210 356, 210 380" delay={0.8} />
            <Stroke d="M180 298 C 182 330, 184 356, 186 382" delay={0.8} />
            <Stroke d="M186 382 L210 380" delay={0.9} />
            {/* trousers, mid-stride, and shoes */}
            <Stroke
                d="M204 296 C 210 332, 216 368, 222 404 C 228 436, 232 470, 236 500"
                delay={0.9}
            />
            <Stroke
                d="M176 300 C 184 336, 192 370, 198 404 C 204 436, 208 470, 212 500"
                delay={0.9}
            />
            <Stroke
                d="M132 300 C 128 336, 126 370, 122 404 C 118 436, 112 470, 106 500"
                delay={0.9}
            />
            <Stroke
                d="M162 302 C 156 338, 150 372, 146 404 C 142 436, 136 470, 130 500"
                delay={0.9}
            />
            <Stroke d="M208 330 C 214 370, 218 410, 222 450" soft delay={1} />
            <Stroke d="M148 330 C 144 370, 140 410, 134 450" soft delay={1} />
            <Stroke
                d="M212 500 C 214 510, 228 518, 258 520 L 262 522 L 234 522 C 236 512, 236 506, 234 500 Z"
                delay={1.1}
            />
            <Stroke
                d="M108 500 C 106 510, 100 518, 90 520 L 86 522 L 130 522 C 131 512, 131 506, 130 500 Z"
                delay={1.1}
            />
            {/* near arm, open hand held out in front */}
            <g className="arm-l">
                <Stroke d="M136 196 C 150 212, 164 226, 176 242" delay={0.5} />
                <Stroke d="M152 186 C 166 202, 180 216, 192 230" delay={0.5} />
                <Stroke d="M176 242 C 192 248, 208 252, 222 258" delay={0.6} />
                <Stroke d="M192 230 C 206 236, 220 240, 234 244" delay={0.6} />
                <Stroke
                    d="M222 258 C 234 264, 248 258, 254 248 C 244 243, 236 243, 234 244"
                    delay={0.7}
                />
                <Stroke d="M250 254 L262 252" soft delay={0.7} />
                <Stroke d="M252 247 L263 241" soft delay={0.7} />
                <Link a={M.shoulderL} b={M.elbowL} index={6} />
                <Link a={M.elbowL} b={M.handL} index={7} />
                <Star at={M.elbowL} index={7} />
                <Star at={M.handL} bright index={8} />
            </g>
            {/* far arm raised, open hand waving */}
            <g className="arm-r">
                <Stroke d="M190 174 C 204 162, 218 150, 232 136" delay={0.5} />
                <Stroke d="M204 186 C 218 172, 232 160, 246 148" delay={0.5} />
                <Stroke d="M232 136 C 242 124, 252 112, 260 100" delay={0.6} />
                <Stroke d="M246 148 C 254 134, 262 122, 270 110" delay={0.6} />
                <Stroke d="M256 98 L 272 112" soft delay={0.7} />
                <g className="hand">
                    <Stroke
                        d="M262 100 C 264 90, 276 86, 284 94 C 288 102, 282 112, 270 112"
                        delay={0.7}
                    />
                    <Stroke d="M267 90 L264 78" soft delay={0.8} />
                    <Stroke d="M274 87 L274 75" soft delay={0.8} />
                    <Stroke d="M281 90 L285 79" soft delay={0.8} />
                    <Stroke d="M262 100 L252 97" soft delay={0.8} />
                    <Star at={M.handR} bright index={1} />
                </g>
                <Link a={M.handR} b={M.elbowR} index={1} />
                <Link a={M.elbowR} b={M.shoulderR} index={2} />
                <Star at={M.elbowR} index={2} />
            </g>
            {/* constellation */}
            {MAESTRO_LINKS.map(([a, b], index) => (
                <Link key={index} a={a} b={b} index={index + 3} />
            ))}
            {[
                M.shoulderR,
                M.neck,
                M.shoulderL,
                M.chest,
                M.waist,
                M.hipL,
                M.hipR,
                M.tailR,
                M.kneeL,
                M.kneeR,
                M.footL,
                M.footR
            ].map((p, index) => (
                <Star
                    key={index}
                    at={p}
                    bright={p === M.neck || p === M.footR}
                    index={index + 10}
                />
            ))}
        </g>
    </svg>
);

/* ------------------------------------------------------------------------------------ */
/* The dancer: profile facing the headline, one arm high, one reaching forward, hair    */
/* streaming back, skirt caught mid-turn, front foot en pointe.                          */
/* ------------------------------------------------------------------------------------ */

const D = {
    handR: [266, 80] as Point,
    elbowR: [238, 134] as Point,
    shoulderR: [198, 176] as Point,
    crown: [170, 88] as Point,
    hairTip: [282, 136] as Point,
    neck: [168, 160] as Point,
    shoulderL: [138, 178] as Point,
    elbowL: [100, 206] as Point,
    handL: [58, 246] as Point,
    chest: [168, 220] as Point,
    waist: [168, 266] as Point,
    hemL: [86, 420] as Point,
    hemR: [290, 472] as Point,
    kneeL: [134, 462] as Point,
    footL: [108, 530] as Point,
    kneeR: [250, 466] as Point,
    footR: [284, 506] as Point
};

const DANCER_LINKS: Array<[Point, Point]> = [
    [D.crown, D.hairTip],
    [D.neck, D.shoulderL],
    [D.neck, D.chest],
    [D.chest, D.waist],
    [D.waist, D.hemL],
    [D.waist, D.hemR],
    [D.hemL, D.kneeL],
    [D.kneeL, D.footL],
    [D.hemR, D.kneeR],
    [D.kneeR, D.footR]
];

const Dancer: React.FC = () => (
    <svg
        className="cst cst-r"
        viewBox="0 0 320 560"
        role="img"
        aria-label="A dancer mid-turn, drawn as a constellation, one arm raised and hair streaming"
    >
        <g className="fig breathe">
            {/* head */}
            <Stroke d="M146 108 C 150 92, 166 86, 180 90 C 192 94, 196 108, 192 122 C 190 134, 180 144, 168 146 C 156 146, 148 136, 146 126 C 144 120, 144 114, 146 108 Z" />
            <Stroke d="M147 118 C 141 122, 142 128, 148 130" soft delay={0.3} />
            <Stroke d="M150 136 L155 136" soft delay={0.4} />
            <Stroke d="M151 110 L159 108" soft delay={0.4} />
            <Stroke d="M160 146 L160 164" delay={0.3} />
            <Stroke d="M176 146 L178 164" delay={0.3} />
            {/* hair, streaming back */}
            <g className="hair">
                <Stroke
                    d="M150 98 C 164 84, 186 86, 198 100 C 212 112, 220 130, 236 142 C 250 150, 266 148, 282 136"
                    delay={0.2}
                />
                <Stroke d="M196 110 C 214 118, 228 130, 248 136" soft delay={0.3} />
                <Stroke d="M190 122 C 206 134, 222 144, 244 150" soft delay={0.4} />
                <Stroke d="M186 132 C 198 142, 212 150, 230 154" soft delay={0.5} />
                <Link a={D.crown} b={D.hairTip} index={1} />
                <Star at={D.hairTip} index={1} />
            </g>
            {/* bodice */}
            <Stroke d="M138 178 C 142 206, 146 236, 150 262" delay={0.4} />
            <Stroke d="M198 176 C 194 206, 190 236, 186 262" delay={0.4} />
            <Stroke d="M146 176 C 158 186, 174 186, 190 174" delay={0.5} />
            <Stroke d="M150 262 C 162 270, 176 270, 186 262" delay={0.6} />
            <Stroke d="M168 188 L168 262" soft delay={0.6} />
            {/* skirt, caught mid-turn */}
            <g className="skirt">
                <Stroke d="M150 262 C 134 310, 110 360, 86 420" delay={0.6} />
                <Stroke d="M186 262 C 214 320, 250 380, 290 472" delay={0.6} />
                <Stroke
                    d="M86 420 C 120 410, 160 418, 196 442 C 224 458, 252 470, 290 472"
                    delay={0.7}
                />
                <Stroke d="M160 270 C 150 330, 134 380, 120 416" soft delay={0.8} />
                <Stroke d="M172 270 C 176 330, 192 390, 214 446" soft delay={0.8} />
                <Stroke d="M182 268 C 196 320, 222 380, 252 462" soft delay={0.9} />
                <Link a={D.waist} b={D.hemL} index={5} />
                <Link a={D.waist} b={D.hemR} index={6} />
                <Star at={D.hemL} index={11} />
                <Star at={D.hemR} index={12} />
            </g>
            {/* legs */}
            <Stroke d="M140 414 C 136 450, 130 480, 124 510" delay={0.9} />
            <Stroke d="M156 416 C 152 450, 146 480, 142 512" delay={0.9} />
            <Stroke d="M124 510 C 120 520, 112 528, 104 532 L 142 512 Z" delay={1} />
            <Stroke d="M232 452 C 244 470, 254 486, 262 500" delay={0.9} />
            <Stroke d="M248 448 C 258 466, 268 480, 276 494" delay={0.9} />
            <Stroke d="M262 500 C 268 506, 276 508, 288 506 L 276 494 Z" delay={1} />
            {/* forward arm */}
            <g className="arm-l">
                <Stroke d="M134 172 C 120 182, 108 192, 98 200" delay={0.5} />
                <Stroke d="M142 188 C 130 198, 118 208, 108 218" delay={0.5} />
                <Stroke d="M98 200 C 86 212, 74 224, 64 234" delay={0.6} />
                <Stroke d="M108 218 C 96 230, 86 240, 76 250" delay={0.6} />
                <Stroke d="M64 234 C 56 236, 48 244, 50 254 C 60 256, 70 254, 76 250" delay={0.7} />
                <Stroke d="M50 254 L 44 262" soft delay={0.7} />
                <Link a={D.shoulderL} b={D.elbowL} index={2} />
                <Link a={D.elbowL} b={D.handL} index={3} />
                <Star at={D.elbowL} index={5} />
                <Star at={D.handL} bright index={6} />
            </g>
            {/* raised arm */}
            <g className="arm-r">
                <Stroke d="M194 170 C 208 156, 222 144, 234 128" delay={0.5} />
                <Stroke d="M206 184 C 220 170, 232 158, 246 142" delay={0.5} />
                <Stroke d="M234 128 C 244 112, 252 96, 258 80" delay={0.6} />
                <Stroke d="M246 142 C 254 126, 262 110, 270 94" delay={0.6} />
                <Stroke d="M258 80 C 262 70, 270 66, 276 72 C 278 80, 272 88, 266 90" delay={0.7} />
                <Stroke d="M270 66 L 276 56" soft delay={0.7} />
                <Link a={D.shoulderR} b={D.elbowR} index={0} />
                <Link a={D.elbowR} b={D.handR} index={1} />
                <Star at={D.elbowR} index={2} />
                <Star at={D.handR} bright index={3} />
            </g>
            {/* constellation */}
            {DANCER_LINKS.filter((_, i) => i !== 0 && i !== 4 && i !== 5).map(([a, b], index) => (
                <Link key={index} a={a} b={b} index={index + 4} />
            ))}
            <Link a={D.shoulderR} b={D.neck} index={2} />
            {[
                D.shoulderR,
                D.neck,
                D.shoulderL,
                D.chest,
                D.waist,
                D.kneeL,
                D.footL,
                D.kneeR,
                D.footR
            ].map((p, index) => (
                <Star
                    key={index}
                    at={p}
                    bright={p === D.neck || p === D.footL}
                    index={index + 13}
                />
            ))}
        </g>
    </svg>
);

/** Two constellation figures flanking the hero headline on wide screens. */
export const Constellations: React.FC = () => (
    <>
        <Maestro />
        <Dancer />
    </>
);
