// Generated by CoffeeScript 1.6.2
(function() {
  "use strict";
  var EventRegister, LRUCache, PagedAsyncTableModel, Painter, Promise, ScrollBarProxy, SyncTableModel, TableModel, TableView, binary_search, bound, closest, cumsum, distance, domReadyPromise, fattable, isReady, isReadyCallbacks, k, ns, onLoad, smallest_diff_subsequence, v, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  cumsum = function(arr) {
    var cs, s, x, _i, _len;

    cs = [0.0];
    s = 0.0;
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      x = arr[_i];
      s += x;
      cs.push(s);
    }
    return cs;
  };

  isReady = false;

  isReadyCallbacks = [];

  bound = function(x, m, M) {
    if (x < m) {
      return m;
    } else if (x > M) {
      return M;
    } else {
      return x;
    }
  };

  Promise = (function() {
    function Promise() {
      this.callbacks = [];
      this.result = false;
      this.resolved = false;
    }

    Promise.prototype.then = function(cb) {
      if (this.resolved) {
        return cb(this.result);
      } else {
        return this.callbacks.push(cb);
      }
    };

    Promise.prototype.resolve = function(result) {
      var cb, _i, _len, _ref, _results;

      this.resolved = true;
      this.result = result;
      _ref = this.callbacks;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cb = _ref[_i];
        _results.push(cb(result));
      }
      return _results;
    };

    return Promise;

  })();

  domReadyPromise = new Promise();

  onLoad = function() {
    document.removeEventListener("DOMContentLoaded", onLoad);
    return domReadyPromise.resolve();
  };

  document.addEventListener("DOMContentLoaded", onLoad);

  TableModel = (function() {
    function TableModel() {}

    TableModel.prototype.hasCell = function(i, j) {
      return false;
    };

    TableModel.prototype.hasColumn = function(j) {
      return false;
    };

    TableModel.prototype.getCell = function(i, j, cb) {
      var deferred;

      if (cb == null) {
        cb = (function() {});
      }
      deferred = function() {
        return cb(i + "," + j);
      };
      return setTimeout(deferred, 100);
    };

    TableModel.prototype.getHeader = function(j, cb) {
      if (cb == null) {
        cb = (function() {});
      }
      return cb("col " + j);
    };

    return TableModel;

  })();

  SyncTableModel = (function(_super) {
    __extends(SyncTableModel, _super);

    function SyncTableModel() {
      _ref = SyncTableModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    SyncTableModel.prototype.getCellSync = function(i, j) {
      return i + "," + j;
    };

    SyncTableModel.prototype.getHeaderSync = function(j) {
      return "col " + j;
    };

    SyncTableModel.prototype.hasCell = function(i, j) {
      return true;
    };

    SyncTableModel.prototype.hasHeader = function(j) {
      return true;
    };

    SyncTableModel.prototype.getCell = function(i, j, cb) {
      if (cb == null) {
        cb = (function() {});
      }
      return cb(this.getCellSync(i, j));
    };

    SyncTableModel.prototype.getHeader = function(j, cb) {
      if (cb == null) {
        cb = (function() {});
      }
      return cb("col " + j);
    };

    return SyncTableModel;

  })(TableModel);

  LRUCache = (function() {
    function LRUCache(size) {
      this.size = size != null ? size : 100;
      this.data = {};
      this.lru_keys = [];
    }

    LRUCache.prototype.has = function(k) {
      return this.data.hasOwnProperty(k);
    };

    LRUCache.prototype.get = function(k) {
      return this.data[k];
    };

    LRUCache.prototype.set = function(k, v) {
      var idx, removeKey;

      idx = this.lru_keys.indexOf(k);
      if (idx >= 0) {
        this.lru_keys.splice(idx, 1);
      }
      this.lru_keys.push(k);
      if (this.lru_keys.length >= this.size) {
        removeKey = this.lru_keys.shift();
        delete this.data[removeKey];
      }
      return this.data[k] = v;
    };

    return LRUCache;

  })();

  PagedAsyncTableModel = (function(_super) {
    __extends(PagedAsyncTableModel, _super);

    function PagedAsyncTableModel(cacheSize) {
      if (cacheSize == null) {
        cacheSize = 100;
      }
      this.pageCache = new LRUCache(cacheSize);
      this.headerPageCache = new LRUCache(cacheSize);
      this.fetchCallbacks = {};
      this.headerFetchCallbacks = {};
    }

    PagedAsyncTableModel.prototype.cellPageName = function(i, j) {};

    PagedAsyncTableModel.prototype.headerPageName = function(j) {};

    PagedAsyncTableModel.prototype.getHeader = function(j) {
      var pageName,
        _this = this;

      pageName = this.headerPageName(j);
      if (this.headerPageCache.has(pageName)) {
        return cb(this.headerPageCache.get(pageName)(j));
      } else if (this.headerFetchCallbacks[pageName] != null) {
        return this.headerFetchCallbacks[pageName].push([j, cb]);
      } else {
        this.headerFetchCallbacks[pageName] = [[j, cb]];
        return this.fetchHeaderPage(pageName, function(page) {
          var cb, _i, _len, _ref1, _ref2;

          _this.headerPageCache.set(pageName, page);
          _ref1 = _this.headerFetchCallbacks[pageName];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            _ref2 = _ref1[_i], j = _ref2[0], cb = _ref2[1];
            cb(page(j));
          }
          return delete _this.headerFetchCallbacks[pageName];
        });
      }
    };

    PagedAsyncTableModel.prototype.hasCell = function(i, j) {
      var pageName;

      pageName = this.cellPageName(i, j);
      return this.pageCache.has(pageName);
    };

    PagedAsyncTableModel.prototype.getCell = function(i, j, cb) {
      var pageName,
        _this = this;

      if (cb == null) {
        cb = (function() {});
      }
      pageName = this.cellPageName(i, j);
      if (this.pageCache.has(pageName)) {
        return cb(this.pageCache.get(pageName)(i, j));
      } else if (this.fetchCallbacks[pageName] != null) {
        return this.fetchCallbacks[pageName].push([i, j, cb]);
      } else {
        this.fetchCallbacks[pageName] = [[i, j, cb]];
        return this.fetchCellPage(pageName, function(page) {
          var _i, _len, _ref1, _ref2;

          _this.pageCache.set(pageName, page);
          _ref1 = _this.fetchCallbacks[pageName];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            _ref2 = _ref1[_i], i = _ref2[0], j = _ref2[1], cb = _ref2[2];
            cb(page(i, j));
          }
          return delete _this.fetchCallbacks[pageName];
        });
      }
    };

    PagedAsyncTableModel.prototype.fetchCellPage = function(pageName, cb) {};

    PagedAsyncTableModel.prototype.getHeader = function(j, cb) {
      if (cb == null) {
        cb = (function() {});
      }
      return cb("col " + j);
    };

    return PagedAsyncTableModel;

  })(TableModel);

  binary_search = function(arr, x) {
    var a, b, m, v;

    if (arr[0] > x) {
      return 0;
    } else {
      a = 0;
      b = arr.length;
      while (a + 2 < b) {
        m = (a + b) / 2 | 0;
        v = arr[m];
        if (v < x) {
          a = m;
        } else if (v > x) {
          b = m;
        } else {
          return m;
        }
      }
      return a;
    }
  };

  distance = function(a1, a2) {
    return Math.abs(a2 - a1);
  };

  closest = function() {
    var d, d_, res, vals, x, x_, _i, _len;

    x = arguments[0], vals = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    d = Infinity;
    res = void 0;
    for (_i = 0, _len = vals.length; _i < _len; _i++) {
      x_ = vals[_i];
      d_ = distance(x, x_);
      if (d_ < d) {
        d = d_;
        res = x_;
      }
    }
    return res;
  };

  Painter = (function() {
    function Painter() {}

    Painter.prototype.setupCell = function(cellDiv) {};

    Painter.prototype.setupHeader = function(headerDiv) {};

    Painter.prototype.cleanUpCell = function(cellDiv) {};

    Painter.prototype.cleanUpHeader = function(headerDiv) {};

    Painter.prototype.cleanUp = function(table) {
      var cell, header, _, _ref1, _ref2, _results;

      _ref1 = table.cells;
      for (_ in _ref1) {
        cell = _ref1[_];
        this.cleanUpCell(cell);
      }
      _ref2 = table.columns;
      _results = [];
      for (_ in _ref2) {
        header = _ref2[_];
        _results.push(this.cleanUpHeader(header));
      }
      return _results;
    };

    Painter.prototype.fillHeader = function(headerDiv, data) {
      return headerDiv.textContent = data;
    };

    Painter.prototype.fillCell = function(cellDiv, data) {
      return cellDiv.textContent = data;
    };

    Painter.prototype.fillHeaderPending = function(headerDiv) {
      return headerDiv.textContent = "NA";
    };

    Painter.prototype.fillCellPending = function(cellDiv) {
      return cellDiv.textContent = "NA";
    };

    return Painter;

  })();

  smallest_diff_subsequence = function(arr, w) {
    var l, start;

    l = 1;
    start = 0;
    while (start + l < arr.length) {
      if (arr[start + l] - arr[start] > w) {
        start += 1;
      } else {
        l += 1;
      }
    }
    return l;
  };

  EventRegister = (function() {
    function EventRegister() {
      this.boundEvents = [];
    }

    EventRegister.prototype.bind = function(target, evt, cb) {
      this.boundEvents.push([target, evt, cb]);
      return target.addEventListener(evt, cb);
    };

    EventRegister.prototype.unbindAll = function() {
      var cb, evt, target, _i, _len, _ref1, _ref2;

      _ref1 = this.boundEvents;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        _ref2 = _ref1[_i], target = _ref2[0], evt = _ref2[1], cb = _ref2[2];
        target.removeEventListener(evt, cb);
      }
      return this.boundEvents = [];
    };

    return EventRegister;

  })();

  ScrollBarProxy = (function() {
    function ScrollBarProxy(container, W, H, eventRegister) {
      var bigContentHorizontal, bigContentVertical, onMouseWheel,
        _this = this;

      this.container = container;
      this.W = W;
      this.H = H;
      this.verticalScrollbar = document.createElement("div");
      this.verticalScrollbar.className += " fattable-v-scrollbar";
      this.horizontalScrollbar = document.createElement("div");
      this.horizontalScrollbar.className += " fattable-h-scrollbar";
      this.container.appendChild(this.verticalScrollbar);
      this.container.appendChild(this.horizontalScrollbar);
      bigContentHorizontal = document.createElement("div");
      bigContentHorizontal.style.height = 1 + "px";
      bigContentHorizontal.style.width = this.W + "px";
      bigContentVertical = document.createElement("div");
      bigContentVertical.style.width = 1 + "px";
      bigContentVertical.style.height = this.H + "px";
      this.horizontalScrollbar.appendChild(bigContentHorizontal);
      this.verticalScrollbar.appendChild(bigContentVertical);
      this.scrollLeft = 0;
      this.scrollTop = 0;
      this.horizontalScrollbar.onscroll = function() {
        if (!_this.dragging) {
          _this.scrollLeft = _this.horizontalScrollbar.scrollLeft;
          return _this.onScroll(_this.scrollLeft, _this.scrollTop);
        }
      };
      this.verticalScrollbar.onscroll = function() {
        if (!_this.dragging) {
          _this.scrollTop = _this.verticalScrollbar.scrollTop;
          return _this.onScroll(_this.scrollLeft, _this.scrollTop);
        }
      };
      eventRegister.bind(this.container, 'mousedown', function(evt) {
        if (evt.button === 1) {
          _this.dragging = true;
          _this.container.className = "fattable-body-container fattable-moving";
          _this.dragging_dX = _this.scrollLeft + evt.clientX;
          return _this.dragging_dY = _this.scrollTop + evt.clientY;
        }
      });
      eventRegister.bind(this.container, 'mouseup', function() {
        _this.dragging = false;
        return _this.container.className = "fattable-body-container";
      });
      eventRegister.bind(this.container, 'mousemove', function(evt) {
        var deferred;

        deferred = function() {
          var newX, newY;

          if (_this.dragging) {
            newX = -evt.clientX + _this.dragging_dX;
            newY = -evt.clientY + _this.dragging_dY;
            return _this.setScrollXY(newX, newY);
          }
        };
        return window.setTimeout(deferred, 0);
      });
      eventRegister.bind(this.container, 'mouseout', function(evt) {
        if (_this.dragging) {
          if ((evt.toElement === null) || (evt.toElement.parentElement.parentElement !== _this.container)) {
            _this.container.className = "fattable-body-container";
            return _this.dragging = false;
          }
        }
      });
      if (this.W > this.horizontalScrollbar.clientWidth) {
        this.maxScrollHorizontal = this.W - this.horizontalScrollbar.clientWidth;
      } else {
        this.maxScrollHorizontal = 0;
      }
      if (this.H > this.verticalScrollbar.clientHeight) {
        this.maxScrollVertical = this.H - this.verticalScrollbar.clientHeight;
      } else {
        this.maxScrollVertical = 0;
      }
      onMouseWheel = function(evt) {
        if (evt.type === "mousewheel") {
          return _this.setScrollXY(_this.scrollLeft - evt.wheelDeltaX, _this.scrollTop - evt.wheelDeltaY);
        }
      };
      eventRegister.bind(this.container, "mousewheel", onMouseWheel);
      eventRegister.bind(this.container, "DOMMouseScroll", onMouseWheel);
    }

    ScrollBarProxy.prototype.onScroll = function(x, y) {};

    ScrollBarProxy.prototype.setScrollXY = function(x, y) {
      x = bound(x, 0, this.maxScrollHorizontal);
      y = bound(y, 0, this.maxScrollVertical);
      this.scrollLeft = x;
      this.scrollTop = y;
      this.horizontalScrollbar.scrollLeft = x;
      this.verticalScrollbar.scrollTop = y;
      return this.onScroll(x, y);
    };

    return ScrollBarProxy;

  })();

  TableView = (function() {
    TableView.prototype.readRequiredParameter = function(parameters, k, default_value) {
      if (parameters[k] == null) {
        if (default_value === void 0) {
          throw "Expected parameter <" + k + ">";
        } else {
          return this[k] = default_value;
        }
      } else {
        return this[k] = parameters[k];
      }
    };

    function TableView(parameters) {
      var container,
        _this = this;

      container = parameters.container;
      if (container == null) {
        throw "container not specified.";
      }
      if (typeof container === "string") {
        this.container = document.querySelector(container);
      } else if (typeof container === "object") {
        this.container = container;
      } else {
        throw "Container must be a string or a dom element.";
      }
      this.readRequiredParameter(parameters, "painter", new Painter());
      this.readRequiredParameter(parameters, "autoSetup", true);
      this.readRequiredParameter(parameters, "model");
      this.readRequiredParameter(parameters, "nbRows");
      this.readRequiredParameter(parameters, "rowHeight");
      this.readRequiredParameter(parameters, "columnWidths");
      this.readRequiredParameter(parameters, "rowHeight");
      this.readRequiredParameter(parameters, "headerHeight");
      this.nbCols = this.columnWidths.length;
      this.container.className += " fattable";
      this.H = this.rowHeight * this.nbRows;
      this.columnOffset = cumsum(this.columnWidths);
      this.W = this.columnOffset[this.columnOffset.length - 1];
      this.columns = {};
      this.cells = {};
      this.eventRegister = new EventRegister();
      this.getContainerDimension();
      if (this.autoSetup) {
        domReadyPromise.then(function() {
          return _this.setup();
        });
      }
    }

    TableView.prototype.getContainerDimension = function() {
      this.w = this.container.offsetWidth;
      this.h = this.container.offsetHeight - this.headerHeight;
      this.nbColsVisible = Math.min(smallest_diff_subsequence(this.columnOffset, this.w) + 2, this.columnWidths.length);
      return this.nbRowsVisible = (this.h / this.rowHeight | 0) + 2;
    };

    TableView.prototype.leftTopCornerFromXY = function(x, y) {
      var i, j;

      i = bound(y / this.rowHeight | 0, 0, this.nbRows - this.nbRowsVisible);
      j = bound(binary_search(this.columnOffset, x), 0, this.nbCols - this.nbColsVisible);
      return [i, j];
    };

    TableView.prototype.cleanUp = function() {
      var _ref1;

      this.eventRegister.unbindAll();
      if ((_ref1 = this.ScrollBarProxy) != null) {
        _ref1.onScroll = null;
      }
      this.painter.cleanUp(this);
      this.container.innerHTML = "";
      this.bodyContainer = null;
      return this.headerContainer = null;
    };

    TableView.prototype.setup = function() {
      var c, el, i, j, _i, _j, _k, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6,
        _this = this;

      this.cleanUp();
      this.getContainerDimension();
      this.columns = {};
      this.cells = {};
      this.container.innerHTML = "";
      this.headerContainer = document.createElement("div");
      this.headerContainer.className += " fattable-header-container";
      this.headerContainer.style.height = this.headerHeight + "px";
      this.headerViewport = document.createElement("div");
      this.headerViewport.className = "fattable-viewport";
      this.headerViewport.style.width = this.W + "px";
      this.headerViewport.style.height = this.headerHeight + "px";
      this.headerContainer.appendChild(this.headerViewport);
      this.bodyContainer = document.createElement("div");
      this.bodyContainer.className = "fattable-body-container";
      this.bodyContainer.style.top = this.headerHeight + "px";
      this.bodyViewport = document.createElement("div");
      this.bodyViewport.className = "fattable-viewport";
      this.bodyViewport.style.width = this.W + "px";
      this.bodyViewport.style.height = this.H + "px";
      for (j = _i = _ref1 = this.nbColsVisible, _ref2 = this.nbColsVisible * 2; _i < _ref2; j = _i += 1) {
        for (i = _j = _ref3 = this.nbRowsVisible, _ref4 = this.nbRowsVisible * 2; _j < _ref4; i = _j += 1) {
          el = document.createElement("div");
          this.painter.setupCell(el);
          el.pending = false;
          el.style.height = this.rowHeight + "px";
          this.bodyViewport.appendChild(el);
          this.cells[i + "," + j] = el;
        }
      }
      for (c = _k = _ref5 = this.nbColsVisible, _ref6 = this.nbColsVisible * 2; _k < _ref6; c = _k += 1) {
        el = document.createElement("div");
        el.style.height = this.headerHeight + "px";
        el.pending = false;
        this.painter.setupHeader(el);
        this.columns[c] = el;
        this.headerViewport.appendChild(el);
      }
      this.firstVisibleRow = this.nbRowsVisible;
      this.firstVisibleColumn = this.nbColsVisible;
      this.display(0, 0);
      this.container.appendChild(this.bodyContainer);
      this.container.appendChild(this.headerContainer);
      this.bodyContainer.appendChild(this.bodyViewport);
      this.refreshAllContent();
      this.scroll = new ScrollBarProxy(this.bodyContainer, this.W, this.H, this.eventRegister);
      return this.scroll.onScroll = function(x, y) {
        var _ref7;

        _ref7 = _this.leftTopCornerFromXY(x, y), i = _ref7[0], j = _ref7[1];
        _this.display(i, j);
        _this.headerViewport.style.left = -x + "px";
        _this.bodyViewport.style.left = -x + "px";
        _this.bodyViewport.style.top = -y + "px";
        clearTimeout(_this.scrollEndTimer);
        _this.scrollEndTimer = setTimeout(_this.refreshAllContent.bind(_this), 200);
        return _this.onScroll(x, y);
      };
    };

    TableView.prototype.refreshAllContent = function() {
      var cell, header, i, j, k, _fn, _i, _ref1, _ref2, _results,
        _this = this;

      _fn = function(header) {
        if (header.pending) {
          return _this.model.getHeader(j, function(data) {
            header.pending = false;
            return _this.painter.fillHeader(header, data);
          });
        }
      };
      _results = [];
      for (j = _i = _ref1 = this.firstVisibleColumn, _ref2 = this.firstVisibleColumn + this.nbColsVisible; _i < _ref2; j = _i += 1) {
        header = this.columns[j];
        _fn(header);
        _results.push((function() {
          var _j, _ref3, _ref4, _results1,
            _this = this;

          _results1 = [];
          for (i = _j = _ref3 = this.firstVisibleRow, _ref4 = this.firstVisibleRow + this.nbRowsVisible; _j < _ref4; i = _j += 1) {
            k = i + "," + j;
            cell = this.cells[k];
            if (cell.pending) {
              _results1.push((function(cell) {
                return _this.model.getCell(i, j, function(data) {
                  cell.pending = false;
                  return _this.painter.fillCell(cell, data);
                });
              })(cell));
            } else {
              _results1.push(void 0);
            }
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    TableView.prototype.onScroll = function(x, y) {};

    TableView.prototype.goTo = function(i, j) {
      return this.scroll.setScrollXY(this.columnOffset[j], this.rowHeight * i);
    };

    TableView.prototype.display = function(i, j) {
      this.headerContainer.style.display = "none";
      this.bodyContainer.style.display = "none";
      this.moveX(j);
      this.moveY(i);
      this.headerContainer.style.display = "";
      return this.bodyContainer.style.display = "";
    };

    TableView.prototype.moveX = function(j) {
      var cell, col_width, col_x, dest_j, dj, header, i, k, last_i, last_j, offset_j, orig_j, shift_j, _fn, _i, _j, _ref1,
        _this = this;

      last_i = this.firstVisibleRow;
      last_j = this.firstVisibleColumn;
      shift_j = j - last_j;
      if (shift_j === 0) {
        return;
      }
      dj = Math.min(Math.abs(shift_j), this.nbColsVisible);
      for (offset_j = _i = 0; _i < dj; offset_j = _i += 1) {
        if (shift_j > 0) {
          orig_j = this.firstVisibleColumn + offset_j;
          dest_j = j + offset_j + this.nbColsVisible - dj;
        } else {
          orig_j = this.firstVisibleColumn + this.nbColsVisible - dj + offset_j;
          dest_j = j + offset_j;
        }
        col_x = this.columnOffset[dest_j] + "px";
        col_width = this.columnWidths[dest_j] + "px";
        header = this.columns[orig_j];
        delete this.columns[orig_j];
        if (this.model.hasColumn(dest_j)) {
          this.model.getHeader(dest_j, function(data) {
            header.pending = false;
            return _this.painter.fillHeader(header, data);
          });
        } else if (!header.pending) {
          header.pending = true;
          this.painter.fillHeaderPending(header);
        }
        header.style.left = col_x;
        header.style.width = col_width;
        this.columns[dest_j] = header;
        _fn = function(cell) {
          if (_this.model.hasCell(i, dest_j)) {
            return _this.model.getCell(i, dest_j, function(data) {
              cell.pending = false;
              return _this.painter.fillCell(cell, data);
            });
          } else if (!cell.pending) {
            cell.pending = true;
            return _this.painter.fillCellPending(cell);
          }
        };
        for (i = _j = last_i, _ref1 = last_i + this.nbRowsVisible; _j < _ref1; i = _j += 1) {
          k = i + "," + orig_j;
          cell = this.cells[k];
          delete this.cells[k];
          this.cells[i + "," + dest_j] = cell;
          cell.style.left = col_x;
          cell.style.width = col_width;
          _fn(cell);
        }
      }
      return this.firstVisibleColumn = j;
    };

    TableView.prototype.moveY = function(i) {
      var cell, dest_i, di, j, k, last_i, last_j, offset_i, orig_i, row_y, shift_i, _fn, _i, _j, _ref1,
        _this = this;

      last_i = this.firstVisibleRow;
      last_j = this.firstVisibleColumn;
      shift_i = i - last_i;
      if (shift_i === 0) {
        return;
      }
      di = Math.min(Math.abs(shift_i), this.nbRowsVisible);
      for (offset_i = _i = 0; _i < di; offset_i = _i += 1) {
        if (shift_i > 0) {
          orig_i = last_i + offset_i;
          dest_i = i + offset_i + this.nbRowsVisible - di;
        } else {
          orig_i = last_i + this.nbRowsVisible - di + offset_i;
          dest_i = i + offset_i;
        }
        row_y = dest_i * this.rowHeight + "px";
        _fn = function(cell) {
          if (_this.model.hasCell(dest_i, j)) {
            return _this.model.getCell(dest_i, j, function(data) {
              cell.pending = false;
              return _this.painter.fillCell(cell, data);
            });
          } else if (!cell.pending) {
            cell.pending = true;
            return _this.painter.fillCellPending(cell);
          }
        };
        for (j = _j = last_j, _ref1 = last_j + this.nbColsVisible; _j < _ref1; j = _j += 1) {
          k = orig_i + "," + j;
          cell = this.cells[k];
          delete this.cells[k];
          this.cells[dest_i + "," + j] = cell;
          cell.style.top = row_y;
          _fn(cell);
        }
      }
      return this.firstVisibleRow = i;
    };

    return TableView;

  })();

  fattable = function(params) {
    return new TableView(params);
  };

  ns = {
    TableModel: TableModel,
    TableView: TableView,
    Painter: Painter,
    PagedAsyncTableModel: PagedAsyncTableModel,
    SyncTableModel: SyncTableModel,
    bound: bound
  };

  for (k in ns) {
    v = ns[k];
    fattable[k] = v;
  }

  window.fattable = fattable;

}).call(this);
