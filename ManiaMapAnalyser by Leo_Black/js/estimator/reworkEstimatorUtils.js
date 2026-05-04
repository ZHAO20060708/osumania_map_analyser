import { DAN_INDEX } from "./intervals/index.js";


function precomputeDanBoundaries() {
    const means = DAN_ORDER.map((name) => DAN_MEANS[name]);
    const boundaries = [];

    for (let i = 0; i < DAN_ORDER.length; i += 1) {
        const mean = means[i];
        const lower = i > 0
            ? (means[i - 1] + mean) / 2
            : mean - (((means[1] + mean) / 2) - mean);
        const upper = i < means.length - 1
            ? (mean + means[i + 1]) / 2
            : mean + ((mean - means[i - 1]) / 2);
        boundaries.push([lower, upper]);
    }

    return boundaries;
}

export function estimateDanielDan(sr) {
    const DAN_MEANS = {
        Alpha: 6.562,
        Beta: 6.957,
        Gamma: 7.459,
        Delta: 7.939,
        Epsilon: 9.095,
        Zeta: 9.473,
        Eta: 10.162,
        Theta: 10.782,
    };
    const DAN_BOUNDARIES = precomputeDanBoundaries();

    const DAN_ORDER = Object.keys(DAN_MEANS);
    const DAN_ORDER_START = 11;
    if (!Number.isFinite(sr)) {
        return {
            label: "Unknown",
            numeric: null,
        };
    }

    if (sr < DAN_BOUNDARIES[0][0]) {
        return {
            label: `< ${DAN_ORDER[0]} Low`,
            numeric: null,
        };
    }

    if (sr >= DAN_BOUNDARIES[DAN_BOUNDARIES.length - 1][1]) {
        return {
            label: `> ${DAN_ORDER[DAN_ORDER.length - 1]} High`,
            numeric: null,
        };
    }

    for (let i = 0; i < DAN_ORDER.length; i += 1) {
        const [lower, upper] = DAN_BOUNDARIES[i];
        if (sr >= lower && sr < upper) {
            const tRaw = (sr - lower) / (upper - lower);
            const t = Math.max(0, Math.min(tRaw, 1));
            const numeric = Number((DAN_ORDER_START + i + t).toFixed(2));

            let label;
            if (t < 1 / 3) {
                label = `${DAN_ORDER[i]} Low`;
            } else if (t < 2 / 3) {
                label = `${DAN_ORDER[i]} Mid`;
            } else {
                label = `${DAN_ORDER[i]} High`;
            }
            
            switch (i){
                case 5:
                    label = `Emik ${label}`;
                    break;
                case 6:
                    label = `Thaumiel ${label}`;
                    break;
                case 7:
                    label = `CloverWisp ${label}`;
                    break;
                default:
                    break;
            }

            return {
                label,
                numeric,
            };
        }
    }

    return {
        label: "Unknown",
        numeric: null,
    };
}

function intervalLookup(sr, table, fallbackLabel) {
    for (const [lower, upper, name] of table) {
        if (lower <= sr && sr <= upper) return name;
    }
    if (sr < table[0][0]) return `< ${table[0][2]}`;
    if (sr > table[table.length - 1][1]) return `> ${table[table.length - 1][2]}`;
    return fallbackLabel;
}

export function estDiff(sr, lnRatio, columnCount) {
    const keys = DAN_INDEX[columnCount];
    if (!keys) return "Unknown difficulty";

    const rcTable = keys.RC[Object.keys(keys.RC)[0]] ?? keys.RC.default;
    const rcDiff = intervalLookup(sr, rcTable, "Unknown RC difficulty");
    if (lnRatio < 0.15) return rcDiff;

    const lnTable = keys.LN[Object.keys(keys.LN)[0]] ?? keys.LN.default;
    const lnDiff = intervalLookup(sr, lnTable, "Unknown LN difficulty");
    return `${rcDiff} || ${lnDiff}`;
}

export function normalizeReworkResult(result) {
    if (typeof result === "number") {
        if (result === -1) {
            throw new Error("Beatmap parse failed");
        }
        if (result === -2) {
            throw new Error("Beatmap mode is not mania");
        }
        throw new Error(`Unknown result code: ${result}`);
    }

    let sr;
    let lnRatio;
    let columnCount;
    let graph = null;

    if (Array.isArray(result)) {
        [sr, lnRatio, columnCount] = result;
    } else if (result && typeof result === "object") {
        sr = Number(result.star);
        lnRatio = Number(result.lnRatio);
        columnCount = Number(result.columnCount);
        graph = result.graph && typeof result.graph === "object" ? result.graph : null;
    } else {
        throw new Error("Unexpected calculation result format");
    }

    if (!Number.isFinite(sr) || !Number.isFinite(lnRatio) || !Number.isFinite(columnCount)) {
        throw new Error("Invalid estimator output");
    }

    return {
        star: sr,
        lnRatio,
        columnCount,
        graph,
    };
}
