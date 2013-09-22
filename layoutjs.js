(function() {
    'use strict';
    var finalizations = [];
    var elements_pool = [];
    var sizeinc = 0;
    var run_finalizations = function() {
        for (var i = 0; i < finalizations.length; i++) {
            finalizations[i]();
        }
        sizeinc = 0;
        finalizations = [];
        elements_pool = [];
    };

    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    var get_computedCss = typeof window.getComputedStyle === 'function' ? function(ob, property) {
        return window.getComputedStyle(ob)[property];
    } : function(element, property) {
        return element.currentStyle[property];
    };

    var get_computedCssNumeric = typeof window.getComputedStyle === 'function' ? function(ob, property) {
        return parseFloat(window.getComputedStyle(ob)[property], 10);
    } : function(element, property) { //Polyfill ie8
        var value = element.currentStyle[property].match(/([\d\.]+)(%|cm|in|mm|pc|pt|)/), size, suffix;

        if (!value) {
            return property === 'width' ? element.clientWidth :
                    property === 'height' ? element.clientHeight : 0;
        }

        size = value[1];
        suffix = value[2];

        return  suffix === '%' ? size / 100 * (property === 'width' ||
                property === 'marginLeft' || property === 'marginRight' ||
                property === 'paddingLeft' || property === 'paddingRight' ||
                property === 'borderWidthLeft' || property === 'borderWidthRight'
                ? element.parentNode.clientWidth : element.parentNode.clientHeight) :
                suffix === 'cm' ? size * 0.3937 * 96 :
                suffix === 'in' ? size * 96 :
                suffix === 'mm' ? size * 0.3937 * 96 / 10 :
                suffix === 'pc' ? size * 12 * 96 / 72 :
                suffix === 'pt' ? size * 96 / 72 :
                parseFloat(size);
    };

    var get_width = function(ob) {
        var width = get_computedCssNumeric(ob, 'width');

        if (get_computedCss(ob, 'boxSizing') !== 'border-box') {
            width += get_computedCssNumeric(ob, 'paddingLeft');
            width += get_computedCssNumeric(ob, 'paddingRight');
        }

        width += get_computedCssNumeric(ob, 'borderRightWidth');
        width += get_computedCssNumeric(ob, 'borderLeftWidth');

        width += get_computedCssNumeric(ob, 'marginRight');
        width += get_computedCssNumeric(ob, 'marginLeft');

        return width;
    };



    var set_width = function(ob, width) {

        if (get_computedCss(ob, 'boxSizing') !== 'border-box') {
            width -= get_computedCssNumeric(ob, 'paddingLeft');
            width -= get_computedCssNumeric(ob, 'paddingRight');
        }

        width -= get_computedCssNumeric(ob, 'borderRightWidth');
        width -= get_computedCssNumeric(ob, 'borderLeftWidth');

        width -= get_computedCssNumeric(ob, 'marginRight');
        width -= get_computedCssNumeric(ob, 'marginLeft');

        if (width < 0)
            width = 0;

        ob.style.width = width + 'px';
    };


    var get_height = function(ob) {
        var height = get_computedCssNumeric(ob, 'height');

        if (get_computedCss(ob, 'boxSizing') !== 'border-box') {
            height += get_computedCssNumeric(ob, 'paddingTop');
            height += get_computedCssNumeric(ob, 'paddingBottom');
        }

        height += get_computedCssNumeric(ob, 'borderTopWidth');
        height += get_computedCssNumeric(ob, 'borderBottomWidth');

        height += get_computedCssNumeric(ob, 'marginTop');
        height += get_computedCssNumeric(ob, 'marginBottom');

        return height;
    };



    var set_height = function(ob, height) {

        if (get_computedCss(ob, 'boxSizing') !== 'border-box') {
            height -= get_computedCssNumeric(ob, 'paddingTop');
            height -= get_computedCssNumeric(ob, 'paddingBottom');
        }

        height -= get_computedCssNumeric(ob, 'borderTopWidth');
        height -= get_computedCssNumeric(ob, 'borderBottomWidth');

        height -= get_computedCssNumeric(ob, 'marginTop');
        height -= get_computedCssNumeric(ob, 'marginBottom');

        if (height < 0)
            height = 0;
        ob.style.height = height + 'px';
    };

    var move_siblings = typeof document.documentElement.nextElementSibling !== 'undefined' ? function(ob, pos, direction) {
        while ((ob = ob.nextElementSibling) !== null) {
            ob.style[direction] = (get_computedCssNumeric(ob, direction) + pos) + 'px';
        }
    } : function(ob, pos, direction) { //Polyfill ie8
        while ((ob = ob.nextSibling) != null) {
            if (ob.nodeType === 1)
                ob.style[direction] = (get_computedCssNumeric(ob, direction) + pos) + 'px';
        }
    };


    var set_top = function(ob, pos, all) {
        ob.style.top = ((all === true || ob.parentNode.children[0] === ob) ? get_computedCssNumeric(ob.parentNode, 'paddingTop') + pos : pos) + 'px';
    };

    var set_left = function(ob, pos, all) {
        ob.style.left = ((all === true || ob.parentNode.children[0] === ob) ? get_computedCssNumeric(ob.parentNode, 'paddingLeft') + pos : pos) + 'px';
    };

    var constraints = {
        horizontal: {
            _default: function(ob) {
                ob.style.position = "absolute";
                set_top(ob, 0, true);
                set_left(ob, sizeinc);
                sizeinc += get_width(ob);
            },
            expand: function(ob, parent) {
                elements_pool.push(ob);
                ob.style.position = "absolute";
                set_top(ob, 0, true);
                set_left(ob, sizeinc);
                if (elements_pool.length === 1) {
                    finalizations.push(function() {

                        var width = get_computedCssNumeric(parent, 'width');

                        width = (width - sizeinc) / elements_pool.length;

                        for (var i = 0; i < elements_pool.length; i++) {
                            if (width)
                                move_siblings(elements_pool[i], width, 'left');
                            set_width(elements_pool[i], width);
                        }
                    });
                }
            }
        },
        vertical: {
            _default: function(ob) {
                ob.style.position = "absolute";
                set_top(ob, sizeinc);
                set_left(ob, 0, true);
                sizeinc += get_height(ob);
            },
            expand: function(ob, parent) {
                elements_pool.push(ob);
                ob.style.position = "absolute";
                set_top(ob, sizeinc);
                set_left(ob, 0, true);

                if (elements_pool.length === 1) {
                    finalizations.push(function() {
                        var height = get_computedCssNumeric(parent, 'height');
                        height = (height - sizeinc) / elements_pool.length;
                        for (var i = 0; i < elements_pool.length; i++) {
                            if (height)
                                move_siblings(elements_pool[i], height, 'top');
                            set_height(elements_pool[i], height);
                        }
                    });
                }
            }
        }
    };
    var layouts = {
        horizontal: function(pobj) {
            var cur_constraints;
            var ob_list = pobj.children;
            var height = 0;
            pobj.style.position = 'absolute';
            for (var i = 0; i < ob_list.length; i++) {
                cur_constraints = (ob_list[i].getAttribute('data-layout-constraints') || '_default').trim().split(',');
                for (var j = 0; j < cur_constraints.length; j++) {
                    if (typeof constraints.horizontal[cur_constraints[j]] === 'function') {
                        constraints.horizontal[cur_constraints[j]](ob_list[i], pobj);
                    } else {
                        if (cur_constraints[j])
                            console.log("Horizontal Layout Constraint \"" + cur_constraints[j] + "\" Not Exists ");
                    }

                }

                var _heitght = get_height(ob_list[i]);
                if (height < _heitght)
                    height = _heitght;
            }
            if (!pobj.getAttribute('data-layout-constraints'))
                pobj.style.height = height + 'px';
        },
        vertical: function(pobj) {
            var cur_constraints;
            var ob_list = pobj.children;
            pobj.style.position = "absolute";
            var width = get_computedCssNumeric(pobj, 'width');

            for (var i = 0; i < ob_list.length; i++) {
                cur_constraints = (ob_list[i].getAttribute('data-layout-constraints') || '_default').trim().split(',');
                set_width(ob_list[i], width);
                for (var j = 0; j < cur_constraints.length; j++) {
                    if (typeof constraints.vertical[cur_constraints[j]] === 'function') {
                        constraints.vertical[cur_constraints[j]](ob_list[i], pobj);
                    } else {
                        if (cur_constraints[j])
                            console.log("Vertical Layout Constraint \"" + cur_constraints[j] + "\" Not Exists ");
                    }
                }
            }
        },
        hcenter: function(objs) {
            objs.style.position = 'absolute';
            var width = get_width(objs);
            var parent_width = get_width(objs.offsetParent);
            objs.style.left = ((parent_width - width) / 2) + 'px';
        },
        vcenter: function(objs) {
            objs.style.position = 'absolute';
            var height = get_height(objs);
            var parent_height = get_height(objs.offsetParent);
            objs.style.top = ((parent_height - height) / 2) + 'px';
        },
        fullheight: function(obj) {
            set_height(obj, get_height(obj.parentNode));
        },
        fullwidth: function(obj) {
            set_width(obj, get_width(obj.parentNode));
        }
    };



    window.layoutjs = function(auto) {

        window.layoutjs.relayout();

        if (auto) {
            if (window.addEventListener)
                window.addEventListener('resize', window.layoutjs.relayout);
            else if (window.attachEvent)
                window.attachEvent('onresize', window.layoutjs.relayout);

        }
    };
    var _watch_dog = false;
    var _watch_dog_time = 600;

    var watch_dog = function() {
        if (_watch_dog === true) {
            window.layoutjs.relayout();
            setTimeout(watch_dog, _watch_dog_time);
        }
    };

    window.layoutjs.init = window.layoutjs.run = function(timer) {
        if (typeof timer === 'number')
            _watch_dog_time = timer;
        else if (timer === true)
            _watch_dog_time = 60;
        if (_watch_dog === false) {
            _watch_dog = true;
            watch_dog();
        }
    };

    window.layoutjs.stop = function() {
        _watch_dog = false;
    };
    window.layoutjs.remove = function() {
        if (window.removeEventListener)
            window.removeEventListener('resize', window.layoutjs.relayout);
        else if (window.dettachEvent)
            window.dettachEvent('resize', window.layoutjs.relayout);
    };

    //Polyfill ie7
    if (!document.querySelectorAll) {
        if (typeof Sizzle !== 'undefined') {
            document.querySelectorAll = Sizzle;
        } else if (typeof jQuery !== 'undefined') {
            document.querySelectorAll = jQuery;
        }
    }

    window.layoutjs.relayout = function() {
        var objects = document.querySelectorAll("[data-layout]"),
                cur_ob, cur_layout;



        for (var i = 0; i < objects.length; i++) {
            cur_ob = objects[i];
            cur_layout = (cur_ob.getAttribute('data-layout') || '_default').trim().split(',');

            for (var j = 0; j < cur_layout.length; j++) {
                if (typeof layouts[cur_layout[j]] === 'function') {
                    layouts[cur_layout[j]](cur_ob);
                    run_finalizations();
                } else {
                    if (cur_layout[j])
                        console.log("Layout " + cur_layout[j] + " Not Exists ");
                }
            }
        }
    };

})();


// Place any jQuery/helper plugins in here.
