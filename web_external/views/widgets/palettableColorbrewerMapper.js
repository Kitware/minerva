import _ from 'underscore';

const colorbrewerCategories = {
    sequential: ["Blues", "BuGn", "BuPu", "GnBu", "Greens", "Greys", "OrRd", "Oranges", "PuBu", "PuBuGn", "PuRd", "Purples", "RdPu", "Reds", "YlGn", "YlGnBu", "YlOrBr", "YlOrRd"],
    diverging: ["BrBG", "PRGn", "PiYG", "PuOr", "RdBu", "RdGy", "RdYlBu", "RdYlGn", "Spectral"],
    qualitative: ["Accent", "Dark2", "Paired", "Pastel1", "Pastel2", "Set1", "Set2", "Set3"]
}

const colorbrewerMapper = {
    toRamp(palettable) {
        if (!palettable) {
            return null;
        }
        return palettable.split('.').slice(-1)[0].split('_')[0];
    },

    toPalettable(ramp) {
        if (!ramp) {
            return null;
        }
        var category = _.pairs(colorbrewerCategories).find((pair) => pair[1].indexOf(ramp) !== -1)[0];
        return `colorbrewer.${category}.${ramp}_6`;
    }
}

export default colorbrewerMapper;

export { colorbrewerCategories };