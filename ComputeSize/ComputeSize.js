var ComputeSize;

var _computeWidth;
_computeWidth = function (originWidth, baseWidth, refWidth) {
    var rate;
    rate = originWidth / baseWidth;
    return refWidth * rate;
};
ComputeSize = function (varArgs) {
    var defaults, opts, tgtCurWidth, verticalRate;
    defaults = {
        originWidth: 0,
        originHeight: 0,
        baseWidth: 800,
        maxBaseWidth: 800,
        refWidth: $(window).width()
    };
    opts = $.extend(defaults, {}, varArgs);
    if (opts.refWidth >= opts.maxBaseWidth) {
        opts.refWidth = opts.maxBaseWidth;
    }
    tgtCurWidth = _computeWidth(opts.originWidth, opts.baseWidth, opts.refWidth);
    verticalRate = opts.originHeight / opts.originWidth;
    return {
        width: tgtCurWidth,
        height: Math.round(tgtCurWidth * verticalRate)
    };
};

module.exports = ComputeSize;
