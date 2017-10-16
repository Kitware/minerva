import _ from 'underscore';
import colorbrewer from 'colorbrewer';

const colorbrewerCategories = {
    sequential: ['Blues_9', 'BuGn_9', 'BuPu_9', 'GnBu_9', 'Greens_9', 'Greys_9', 'OrRd_9', 'Oranges_9', 'PuBu_9', 'PuBuGn_9', 'PuRd_9', 'Purples_9', 'RdPu_9', 'Reds_9', 'YlGn_9', 'YlGnBu_9', 'YlOrBr_9', 'YlOrRd_9'],
    diverging: ['BrBG_11', 'PRGn_11', 'PiYG_11', 'PuOr_11', 'RdBu_11', 'RdGy_11', 'RdYlBu_11', 'RdYlGn_11', 'Spectral_11'],
    qualitative: ['Accent_8', 'Dark2_8', 'Paired_12', 'Pastel1_9', 'Pastel2_8', 'Set1_9', 'Set2_8', 'Set3_12']
};

const palettableColorbrewerMapper = {
    toRamp(palettable) {
        if (!palettable) {
            return null;
        }
        return palettable.split('.').slice(-1)[0].split('_')[0];
    },

    toRampColors(palettable) {
        if (!palettable) {
            return null;
        }
        var [ramp, number] = palettable.split('.').slice(-1)[0].split('_');
        return colorbrewer[ramp][number];
    },

    toPalettable(rampName) {
        if (!rampName) {
            return null;
        }
        let category, ramp;
        for (let pair of _.pairs(colorbrewerCategories)) {
            for (let rampWithNumber of pair[1]) {
                if (rampWithNumber.split('_')[0] === rampName) {
                    category = pair[0];
                    ramp = rampWithNumber;
                }
            }
        }
        return `colorbrewer.${category}.${ramp}`;
    }
};

export default palettableColorbrewerMapper;

export { colorbrewerCategories };
