/*
  Object.extend(Float32Array.prototype, ArrayMixin);
  var vecf32 = function(arg){ return new Float32Array(arg); };
  var a = vecf32([1,2,3,4,5,6]);
  // (1,2,3,4,5,6)
  a.filter(function(v) { return v>3; });
  // (4,5,6)
  a.reverse();
  // (6,5,4,3,2,1)
  a.replaceSlice(1,-1, vecf32([100, 200]));
  // (1, 100, 200, 6)
  a.map(function(e) { return e*10; });
  // (10,20,30,40,50,60)
  a.foldLeft(function(s, e) { return s + e; }, 0);
  // 21
  a.sum();
  // 21
  a.product();
  // 720
  a.scanLeft(function(s,e){ return s + e; }, 0);
  // (0, 1, 3, 6, 10, 15, 21)
*/

Math.clamp = function(v, min, max) {
  return Math.max(Math.min(v, max), min);
};

Object.add = function(a, b) {
  var o = {};
  for (var i in a) o[i] = a[i];
  for (var i in b) o[i] = b[i];
  return o;
};

Object.extend = function(a, b) {
  for (var i in b) a[i] = b[i];
  return a;
};

Fun = {
  id : function(x) { return x; },
  not : function(f) { return function(var_args) { return !f.apply(null, arguments); }; },
  constant : function(x) {
    return function() { return x; };
  },
  
  unfold : function(f, init) {
    var v = [init, false];
    while (!v[1]) {
      v = f(init);
      init = v[0];
    }
    return init;
  },
  
  unfoldN : function(f, init, n) {
    for (var i=0; i<n; i++)
      init = f(init, i);
    return init;
  }
};


Opt = function(hasValue, value) {
  this.hasValue = hasValue;
  this.value = value;
};
Opt.some = function(v) { return new Opt(true, v); };
Opt.none = function() { return new Opt(false, null); };
Opt.map = function(f, v) {
  if (v.hasValue) return Opt.some(f(v.value)); 
  else return v; 
};
Opt.prototype = {
  map : function(f) { return Opt.map(f, this); }
};


GenericFoldMixin = Object.add({

  zero : 0,
  
  foldLeft : function(f, init) {
    return this.foldLeftBreak(function(s,i,v) {
      return [f(s,i,v), false];
    }, init);
  },

  foldRight : function(f, init) {
    return this.foldRightBreak(function(s,i,v) {
      return [f(s,i,v), false];
    }, init);
  },

  init : function(f, length) {
    return Fun.unfoldN(function(a,i) {
      return a.append(f(i));
    }, this.empty(), length);
  },
  
  replicate : function(value, length) {
    return this.init(Fun.constant(value), length);
  },
  
  alloc : function(length) {
    return this.init(Fun.constant(this.zero), length);
  },
  
  append : function(value) {
    return this.foldRight(function(a,v){
      return a.prepend(v);
    }, this.empty().prepend(value));
  },
  
  prepend : function(value) {
    return this.foldLeft(function(a,v){
      return a.append(v);
    }, this.empty().append(value));
  },
  
  concat : function(var_args) {
    var acc = this.copy();
    for (var i=0; i<arguments.length; i++) {
      acc = arguments[i].foldLeft(function(a,v){
        return a.append(v);
      }, acc);
    }
    return acc;
  },
  
  getLength : function() {
    return this.foldLeft(function(s){ return s+1; }, 0);
  },
  
  getAt : function(i) {
    return this.foldLeftBreak(function(o,v,j) {
      if (i == j) return [Opt.some(v), true];
      else return [o, false];
    }, Opt.none());
  },
  
  setAt : function(i, value) {
    return this.foldLeft(function(acc,v,j) {
      if (i == j) return acc.append(value);
      else return acc.append(v);
    }, this.empty());
  },

  map : function(f) {
    return this.foldLeft(function(a, v, i) {
      return a.append(f(v,i));
    }, this.empty());
  },
  
  each : function(f) {
    return this.foldLeft(function(n, v, i) {
      return f(v, i);
    }, null);
  },

  copy : function() {
    return this.map(Fun.id);
  },
  
  foldLeft1 : function(f) {
    var s = this;
    return this.first().map(function(h) {
      return s.tail().foldLeft(f, h);
    });
  },

  foldRight1 : function(f) {
    var s = this;
    return this.last().map(function(l) {
      return s.prefix().foldRight(f, l);
    });
  },
  
  scanLeft : function(f, init) {
    return this.foldLeft(function(s,i) {
      var v = f(s[0], i);
      return [v, s[1].append(v)];
    }, [init, this.empty().append(init)])[1];
  },
  
  scanRight : function(f, init) {
    return this.foldRight(function(s,i) {
      var v = f(s[0], i);
      return [v, s[1].prepend(v)];
    }, [init, this.empty().prepend(init)])[1];
  },
  
  scanLeft1 : function(f) {
    var s = this;
    return this.first().map(function(h) {
      return s.tail().scanLeft(f, h);
    });
  },

  scanRight1 : function(f) {
    var s = this;
    return this.last().map(function(l) {
      return s.prefix().scanRight(f, l);
    });
  },
  
  reverse : function() {
    return this.foldLeft(function(a, v, i) {
      return a.prepend(v);
    }, this.empty());
  },
  
  reverseMap : function() {
    return this.foldLeft(function(a, v, i) {
      return a.prepend(f(v,i));
    }, this.empty());
  },
  
  find : function(f) {
    return this.foldLeftBreak(function(o, v, i) {
      if (f(v)) return [Opt.some({value: v, index: i}), true];
      else return [o, false];
    }, Opt.none());
  },
  
  any : function(f) {
    return this.find(f).hasValue;
  },
  
  all : function(f) {
    return !this.find(Fun.not(f)).hasValue;
  },

  indexOf : function(f) {
    return this.find(f).map(function(v) { return v.index; });
  },
  
  parseIndex : function(idx, l) {
    if (idx >= 0) return idx;
    else return (l == null ? this.getLength() : l)+idx;
  },
  
  slice : function(start, end) {
    var l = this.getLength();
    start = this.parseIndex(start, l);
    end = end == null ? l : this.parseIndex(end, l);
    return this.foldLeftBreak(function(a, v, i) {
      if (i >= start && i < end) return [a.append(v), false];
      else return [a, i >= end];
    }, this.empty());
  },
  
  replaceSlice : function(start, end, replacement) {
    var l = this.getLength();
    start = this.parseIndex(start, l);
    end = end == null ? l : this.parseIndex(end, l);
    replacement = replacement == null ? this.empty() : replacement;
    if (start >= l)
      return this.concat(replacement);
    return this.foldLeft(function(a, v, i) {
      if (i == start) a = a.concat(replacement);
      if (i < start || i >= end) return a.append(v);
      else return a;
    }, this.empty());
  },
    
  sum : function() {
    return this.foldLeft(function(s,i) { return s+i; }, 0);
  },
  
  product : function() {
    return this.foldLeft(function(s,i) { return s*i; }, 1);
  },
  
  first : function() {
    return this.foldLeftBreak(function(n,h) {
      return [Opt.some(h), true];
    }, Opt.none());
  },
  
  last : function() {
    return this.foldRightBreak(function(n,h) {
      return [Opt.some(h), true];
    }, Opt.none());
  },
  
  tail : function() {
    return this.foldLeft(function(l, e, i) {
      if (i > 0) return l.append(e);
      else return l;
    }, this.empty());
  },
  
  prefix : function() {
    return this.foldLeft(function(l, e) {
      return [l[1], l[1].append(e)];
    }, [this.empty(), this.empty()])[0];
  },
  
  maximum : function() {
    return this.foldLeft1(function(a,b){ return (a>=b ? a : b); });
  },

  minimum : function() {
    return this.foldLeft1(function(a,b){ return (a<=b ? a : b); });
  },
  
  arrayMap : function(f) {
    return this.foldLeft(function(s, i){
      s.push(f(i));
      return s;
    }, []);
  },
  
  concatMap : function(f) {
    return this.foldLeft(function(s, i) {
      return s.concat(f(i));
    }, this.empty());
  },
  
  takeWhile : function(f) {
    var o = this.find(Fun.not(f));
    return (o.hasValue ? this.slice(0, o.value.index) : this.copy());
  },

  dropWhile : function(f) {
    var o = this.find(Fun.not(f));
    return (o.hasValue ? this.slice(o.value.index) : this.empty());
  }

});


GenericArrayFoldMixin = Object.add(GenericFoldMixin, {

  getLength : function() {
    return this.length;
  },
  
  empty : function() {
    return this.alloc(0);
  },

  alloc : function(length) {
    return new this.constructor(length);
  },
  
  append : function(v) {
    var l = this.getLength();
    var a = this.alloc(l+1);
    for (var i=0; i<l; i++)
      a.set(i, this.get(i));
    a.set(l, v);
    return a;
  },
  
  prepend : function(v) {
    var l = this.getLength();
    var a = this.alloc(l+1);
    a.set(0, v);
    for (var i=0; i<l; i++)
      a.set(i+1, this.get(i));
    return a;
  },
  
  foldLeft : function(f, init) {
    for (var i=0, l=this.getLength(); i<l; i++)
      init = f(init, this.get(i), i);
    return init;
  },
  
  foldLeftBreak : function(f, init) {
    var v = [init, false];
    for (var i=0, l=this.getLength(); i<l; i++) {
      v = f(v[0], this.get(i), i);
      if (v[1]) break;
    }
    return v[0];
  },

  foldRight : function(f, init) {
    var l = this.getLength()-1;
    for (var i=l; i>=0 ; i--) {
      init = f(init, this.get(i), i);
    }
    return init;
  },
  
  foldRightBreak : function(f, init) {
    var v = [init, false];
    var l = this.getLength()-1;
    for (var i=l; i>=0; i--) {
      v = f(v[0], this.get(i), i);
      if (v[1]) break;
    }
    return v[0];
  },
  
  foldLeft1 : function(f) {
    var l = this.getLength();
    if (l < 1) return Opt.none();
    var init = this.get(0);
    for (var i=1; i<l; i++)
      init = f(init, this.get(i), i);
    return Opt.some(init);
  },

  foldRight1 : function(f, init) {
    var l = this.getLength();
    if (l < 1) return Opt.none();
    l = l-1;
    var init = this.get(l);
    for (var i=l-1; i>=0 ; i--) {
      init = f(init, this.get(i), i);
    }
    return Opt.some(init);
  },
  
  scanLeft : function(f, init) {
    var l = this.getLength();
    var a = this.alloc(l+1);
    a.set(0, init);
    for (var i=0; i<l; i++) {
      init = f(init, this.get(i));
      a.set(i+1, init);
    }
    return a;
  },
  
  scanRight : function(f, init) {
    var l = this.getLength();
    var a = this.alloc(l+1);
    a.set(l, init);
    for (var i=l-1; i>=0; i--) {
      init = f(init, this.get(i));
      a.set(i, init);
    }
    return a;
  }
  
});


GenericNiceArrayMixin = Object.add(GenericArrayFoldMixin, {

  init : function(f, length) {
    var a = this.alloc(length);
    for (var i=0; i<length; i++)
      a.set(i, f(i));
    return a;
  },
  
  map : function(f) {
    var array = this;
    return this.init(function(i) { return f(array.get(i)); }, array.length);
  },
  
  each : function(f) {
    for (var i=0; i<this.length; i++)
      f(this.get(i), i);
  },
  
  reverse : function() {
    var array = this;
    var l = array.getLength()-1;
    return this.init( function(i) { return array.get(l-i); }, l+1);
  },

  truncate : function(length) {
    var array = this;
    return this.init(function(i){ 
      return array.get(i); 
    }, Math.clamp(length, 0, array.getLength()));
  },
  
  filter : function(f) {
    var arr = this.alloc(this.getLength());
    var j=0;
    this.each(function(v) { if (f(v)) arr.set(j++, v); });
    return arr.truncate(j);
  },

  reject : function(f) {
    return this.filter(Fun.not(f));
  }
  
});


GenericArrayMixin = Object.add(GenericNiceArrayMixin, {

  map : function(f) {
    var l = this.getLength();
    var a = this.alloc(l);
    for (var i=0; i<l; i++)
      a.set(i, f(this.get(i), i));
    return a;
  },

  copy : function() {
    var l = this.getLength();
    var a = this.alloc(l);
    for (var i=0; i<l; i++)
      a.set(i, this.get(i));
    return a;
  },
  
  reverse : function() {
    var l = this.getLength();
    var a = this.alloc(l);
    var l1 = l-1;
    for (var i=0; i<l; i++)
      a.set(i, this.get(l1-i));
    return a;
  },
  
  truncate : function(length) {
    length = Math.clamp(length, 0, this.getLength());
    var a = this.alloc(length);
    for (var i=0; i<length; i++)
      a.set(i, this.get(i));
    return a;
  },

  filter : function(f) {
    var l = this.getLength();
    var a = this.alloc(l), j = 0;
    for (var i=0; i<l; i++) {
      var v = this.get(i);
      if (f(v)) 
        a.set(j++, v);
    }
    return a.truncate(j);
  },
  
  reject : function(f) {
    var l = this.getLength();
    var a = this.alloc(l), j = 0;
    for (var i=0; i<l; i++) {
      var v = this.get(i);
      if (!f(v)) 
        a.set(j++, v);
    }
    return a.truncate(j);
  },
  
  find : function(f) {
    for (var i=0, l=this.getLength(); i<l; i++) {
      var v = this.get(i);
      if (f(v)) return Opt.some({value:v, index:i});
    }
    return Opt.none();
  }

});


ArrayMixin = Object.add(GenericArrayMixin, {

  init : function(f, length) {
    var a = this.alloc(length);
    for (var i=0; i<length; i++)
      a[i] = f(i);
    return a;
  },
  
  map : function(f) {
    var a = this.alloc(this.length);
    for (var i=0; i<this.length; i++)
      a[i] = f(this[i], i);
    return a;
  },
  
  each : function(f) {
    for (var i=0; i<this.length; i++)
      f(this[i], i);
  },
  
  copy : function() {
    var a = this.alloc(this.length);
    for (var i=0; i<this.length; i++)
      a[i] = this[i];
    return a;
  },

  reverse : function() {
    var l = this.length;
    var a = this.alloc(l);
    var l1 = l-1;
    for (var i=0; i<l; i++)
      a[i] = this[l1-i];
    return a;
  },

  truncate : function(length) {
    length = Math.clamp(length, 0, this.length);
    var a = this.alloc(length);
    for (var i=0; i<length; i++)
      a[i] = this[i];
    return a;
  },
  
  filter : function(f) {
    var a = this.alloc(this.length), j = 0;
    for (var i=0; i<this.length; i++)
      if (f(this[i])) a[j++] = this[i];
    return a.truncate(j);
  },
  
  reject : function(f) {
    var a = this.alloc(this.length), j = 0;
    for (var i=0; i<this.length; i++)
      if (!f(this[i])) a[j++] = this[i];
    return a.truncate(j);
  },
  
  find : function(f) {
    for (var i=0; i<this.length; i++)
      if (f(this[i])) return Opt.some(this[i]);
    return Opt.none();
  },
  
  arrayMap : function(f) {
    var a = new Array(this.length);
    for (var i=0; i<this.length; i++) {
      a[i] = f(this[i]);
    }
    return a;
  },
  
  concatMap : function(f) {
    return this.concat.apply(this.empty(), this.arrayMap(f));
  },
  
  concat : function(var_args) {
    var tl = this.length;
    for (var i=0; i<arguments.length; i++)
      tl += arguments[i].length;
    var a = this.alloc(tl);
    var j = 0;
    for (var i=0; i<this.length; i++,j++)
      a[j] = this[i];
    for (var k=0; k<arguments.length; k++) {
      var other = arguments[k];
      for (var i=0; i<other.length; i++,j++)
        a[j] = other[i];
    }
    return a;
  },
  
  slice : function(start, end) {
    var l = this.length;
    start = Math.max(0,this.parseIndex(start, l));
    end = Math.min(l, end == null ? l : this.parseIndex(end, l));
    var a = this.alloc(Math.max(0,end-start));
    for (var i=start,j=0; i<end; i++,j++)
      a[j] = this[i];
    return a;
  },
  
  replaceSlice : function(start, end, replacement) {
    var l = this.length;
    start = Math.min(l, Math.max(0,this.parseIndex(start, l)));
    end = Math.max(start, Math.min(l, end == null ? l : this.parseIndex(end, l)));
    replacement = replacement == null ? this.empty() : replacement;
    var a = this.alloc(replacement.length+(this.length-end)+start);
    var j = 0;
    for (var i=0; i<start; i++,j++)
      a[j] = this[i];
    for (var i=0; i<replacement.length; i++,j++)
      a[j] = replacement[i];
    for (var i=end; i<this.length; i++,j++)
      a[j] = this[i];
    return a;
  },
  
  first : function() {
    return (this.length > 0 ? Opt.some(this[0]) : Opt.none());
  },
  
  last : function() {
    return (this.length > 0 ? Opt.some(this[this.length-1]) : Opt.none());
  },
  
  tail : function() {
    return this.slice(1);
  },
  
  prefix : function() {
    return this.slice(0,-1);
  },
  
  zip : function(var_args) {
    var l = this.length;
    var a = new Array(l);
    for (var i=0; i<l; i++) {
      var args = this.alloc(arguments.length+1);
      args[0] = this[i];
      for (var j=0; j<arguments.length; j++) {
        args[j+1] = arguments[j][i];
      }
      a[i] = args;
    }
    return a;
  },
  
  zipWith : function(f, var_args) {
    var l = this.length;
    var a = this.alloc(l);
    var args = new Array(Math.max(1, arguments.length));
    for (var i=0; i<l; i++) {
      args[0] = this[i];
      for (var j=1; j<arguments.length; j++) {
        args[j] = arguments[j][i];
      }
      a[i] = f.apply(this, args);
    }
    return a;
  },

  arrayZipWith : function(f, var_args) {
    var l = this.length;
    var a = new Array(l);
    var args = new Array(Math.max(1, arguments.length));
    for (var i=0; i<l; i++) {
      args[0] = this[i];
      for (var j=1; j<arguments.length; j++) {
        args[j] = arguments[j][i];
      }
      a[i] = f.apply(this, args);
    }
    return a;
  },
  
  unzip : function() {
    var h = this.first();
    if (h.hasValue && h.value.length > 0) {
      var a = new Array(h.value.length);
      for (var i=0; i<a.length; i++) {
        a[i] = this.alloc(this.length);
      }
      for (var i=0; i<this.length; i++) {
        var e = this[i];
        for (var j=0; j<a.length; j++) {
          a[j][i] = e[j];
        }
      }
      return a;
    } else {
      return [];
    }
  },
  
  replicate : function(value, length) {
    var a = this.alloc(length);
    for (var i=0; i<length; i++) {
      a[i] = value;
    }
    return a;
  }
  
});

