// get current file URL
var scripts = document.getElementsByTagName("script");
var src     = scripts[scripts.length-1].src;
var listUrl = src.split('/');
listUrl.pop();
listUrl.push("");
var scriptSelectModelViewDir = listUrl.join("/");

getSelectModelViewComponent = async function() {
// ------------------------------------------------------------------------

// get template for component
var templSelectModelView;
await $.asyncGet(scriptSelectModelViewDir + "SelectModelView.html", function(data){
    templSelectModelView = data;
}.bind(this));

var SelectModelView = {
  template: templSelectModelView,
  props: {
    // algorithm input
    selected_range: {
      type    : Array,
      required: true
    },
    uniform_time: {
      type    : Array,
      required: true
    },
    uniform_input: {
      type    : Array,
      required: true
    },
    uniform_output: {
      type    : Array,
      required: true
    },
    // algorithm input/output
	cached_model_list: {
      type    : Array,
      required: true
    },
    // algorithm output 
    selected_model: {
      type    : Object,
      required: true
    },
  },
  data() {
    return {
		max_chart_len    : 300,
		model_list       : [],
		params           : [],
    }
  },
  mounted: async function() {
    // load or create model_list
  	this.model_list.copyFrom(await this.getModelList());  	
  },
  computed: {
    input_chart_data: function() {
	  // first create data
	  var in_data = [];
	  // [ALT]
	  var i = 0;	  
	  while(true) {
	  	var idx = i*this.step_data;
	  	if(idx >= this.uniform_time.length) {
	  		idx = this.uniform_time.length -1 ;
	  	}
	  	in_data.push({
	  		x : this.uniform_time [idx],
	  		y : this.uniform_input[idx]
	  	});
	  	if(idx == this.uniform_time.length-1) {
	  		break;
	  	}
	  	i++;
	  }
	  // then datasets
	  var in_datasets = [
		{
		  label          : 'Input',
		  data           : in_data,
		  borderColor    : '#2185D0',
		}
	  ];
	  // finally chart data
	  var in_chart_data = {
         labels  : this.getLabels(in_data),
         datasets: in_datasets,
      };
      return in_chart_data;
    }, // input_chart_data
    output_chart_data: function() {
	  // first create data
	  var out_data = [];
	  var out_data_selected = [];
      // [ALT]
	  var i = 0;	  
	  while(true) {
	  	var idx = i*this.step_data;
	  	if(idx >= this.uniform_time.length) {
	  		idx = this.uniform_time.length -1 ;
	  	}
	  	out_data.push({
	  		x : this.uniform_time [idx],
	  		y : this.uniform_output[idx]
	  	});
	  	if(this.selected_model.y && this.selected_model.y.length > 0) {
			out_data_selected.push({
				x : this.uniform_time [idx],
				y : this.selected_model.y[idx]
			});
	  	}
	  	if(idx == this.uniform_time.length-1) {
	  		break;
	  	}
	  	i++;
	  }	  
	  // then datasets
	  var out_datasets = [
        {
		  label          : 'Output (Model)',
		  data           : out_data_selected,
		  borderColor    : 'rgba(234, 109, 52, 1)',
		},
		{
		  label          : 'Output (Data)',
		  data           : out_data,
		  borderColor    : '#2185D0',
		},	
	  ];
	  // finally chart data
	  var out_chart_data = {
         labels  : this.getLabels(out_data),
         datasets: out_datasets,
      };
      return out_chart_data;
    }, // output_chart_data
    step_data : function() {
    	// [ALT]
    	return Math.ceil(this.uniform_time.length/this.max_chart_len);
    },
    length_data : function() {
    	// [ALT]
    	return this.output_chart_data.datasets[0].data.length;
    }
  }, // computed
  methods: {
    getLabels(data) {
		var out_labels = [];
		for(var i = 0; i < data.length; i++) {
			out_labels.push(this.getLabel(data[i].x));
		}
		return out_labels;
	},
	getLabel(value) {
		if(typeof value != "number") {
			return '';
		}
		return value.toFixed(2);
	},
	setModel(model) {	
	    // signal that need to recompute next step, because this step is the latest modified step
	    this.$emit('latestStep');
	    // this update is async, because we cannot just set selected_model
	    // so we pass it up with $emit and then wait for it in a watch which
	    // then calls this.modelUpdated
	    this.$emit('updateSelectedModel', model);
	},
	modelUpdated() {		
		// as soon as any model is selected, we can continue
		this.$emit('enableNext');		
		// set params (array of objects)
		this.params.splice(0, this.params.length);
        if(this.selected_model.type == '1stord') {
			var k     = this.selected_model.params[0];
			var tao   = this.selected_model.params[1];
			var theta = this.selected_model.params[2];
			//var y0    = this.selected_model.params[3];
			this.params.push(
				{
					name    : 'k',
					val     : k,
					units   : 'k',
					descrip : 'Gain',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'tao',
					val     : tao ,
					units   : 'τ',
					descrip : 'Time Constant',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'theta',
					val     : theta ,
					units   : 'θ',
					descrip : 'Delay',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
			);
		  }
		  else if(this.selected_model.type == '2ndord') {
			var a1    = this.selected_model.params[0];
			var a2    = this.selected_model.params[1];
			var b     = this.selected_model.params[2];
			var theta = this.selected_model.params[3];
			//var y0    = this.selected_model.params[4];
			// frequency and damping
			var w     = Math.sqrt(-a1);
			var gi    = -a2/(2*w);
			var k     = -b/a1;
			this.params.push(
				{
					name    : 'k',
					val     : k,
					units   : 'k',
					descrip : 'Gain',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'w',
					val     : w ,
					units   : 'ω',
					descrip : 'Frequency',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'gi',
					val     : gi ,
					units   : 'ξ',
					descrip : 'Damping Factor',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'theta',
					val     : theta ,
					units   : 'θ',
					descrip : 'Delay',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
			);
		  }
		  else if(this.selected_model.type == 'integ') {
			var k     = this.selected_model.params[0];
			var theta = this.selected_model.params[1];
			//var y0    = this.selected_model.params[2];
			this.params.push(
				{
					name    : 'k',
					val     : k,
					units   : 'k',
					descrip : 'Gain',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'theta',
					val     : theta ,
					units   : 'θ',
					descrip : 'Delay',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
			);
		  }
		  else if(this.selected_model.type == 'integlag') {
			var k     = this.selected_model.params[0];
			var tao   = this.selected_model.params[1];
			var theta = this.selected_model.params[2];
			//var y0    = this.selected_model.params[3];
			this.params.push(
				{
					name    : 'k',
					val     : k,
					units   : 'k',
					descrip : 'Gain',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'tao',
					val     : tao ,
					units   : 'τ',
					descrip : 'Time Constant',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'theta',
					val     : theta ,
					units   : 'θ',
					descrip : 'Delay',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
			);
		  }
		  else if(this.selected_model.type == 'integdouble') {
			var k     = this.selected_model.params[0];
			var theta = this.selected_model.params[1];
			//var y0    = this.selected_model.params[2];
			this.params.push(
				{
					name    : 'k',
					val     : k,
					units   : 'k',
					descrip : 'Gain',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
				{
					name    : 'theta',
					val     : theta ,
					units   : 'θ',
					descrip : 'Delay',
					editable: true,
					insync  : true,
					oldVal  : ''
				},
			);
		  }
		  else {
			  this.params.splice(0, this.params.length);
		  }
	},
	getModelName(type) {
      if(type == '1stord') {
        return '1st Order';
      }
      else if(type == '2ndord') {
        return '2nd Order';
      }
      else if(type == 'integ') {
        return 'Integrator';
      }
      else if(type == 'integlag') {
        return 'Integrator with Lag';
      }
      else if(type == 'integdouble') {
        return 'Double Integrator';
      }
      else {
          return 'Unknown Model'
      }
	},
	getModelImgUrl(type) {
	  if(type == '1stord') {
        return './assets/models/1stord.svg';
      }
      else if(type == '2ndord') {
        return './assets/models/2ndord.svg';
      }
      else if(type == 'integ') {
        return './assets/models/integ.svg';
      }
      else if(type == 'integlag') {
        return './assets/models/integlag.svg';
      }
      else if(type == 'integdouble') {
        return './assets/models/integdouble.svg';
      }
      else {
          return 'Unknown Model'
      }
	},
	getModelEquation(type) {
	  var eq;
	  if(type == '1stord') {
        eq = '$$\\frac{y(s)}{u(s)} = \\frac{k e^{-\\theta s}}{\\tau s+1}$$';
      }
      else if(type == '2ndord') {
        eq = '$$\\frac{y(s)}{u(s)} = \\frac{k {\\omega}^2 e^{-\\theta s}}{s^2 + 2 \\xi \\omega s + {\\omega}^2}$$';
      }
      else if(type == 'integ') {
        eq = '$$\\frac{y(s)}{u(s)} = \\frac{k e^{-\\theta s}}{s}$$';
      }
      else if(type == 'integlag') {
        eq = '$$\\frac{y(s)}{u(s)} = \\frac{k e^{-\\theta s}}{s(\\tau s + 1)}$$';
      }
      else if(type == 'integdouble') {
        eq = '$$\\frac{y(s)}{u(s)} = \\frac{k e^{-\\theta s}}{s^2}$$';
      }
      else {
        eq = 'Unknown Model'
      }
      // NOTE : need to bind using v-html and the lines below
      this.$nextTick(function() {
	    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
	  });
      return eq;
	},
	getModelList: async function() {
      // update or cache
	  var model_list = [];
	  if(this.cached_model_list.length <= 0) {
	  	// update in worker
		var result = await PidWorker.getModelList({
			uniform_time   : this.uniform_time  ,
			uniform_input  : this.uniform_input ,
			uniform_output : this.uniform_output,
			selected_range : this.selected_range
		});
		// copy results
		model_list.copyFrom(result.model_list);
		// update cache
		this.cached_model_list.copyFrom(model_list);
	  }
	  else {
	  	// use cache
		model_list.copyFrom(this.cached_model_list);
	  }
	  // check if need to set model
	  if(!this.selected_model.y || this.selected_model.y.length == 0) {
		// set first model
		this.setModel(model_list[0]);
	  }
	  else {
	  	this.modelUpdated();
	  }
      // emit step loaded (stop loading animation)
      this.$emit('stepLoaded');
      // return
      return model_list;
    }, // getModelList
    async updateParam(name, value) {
        if(typeof value == "string") {
			value = parseFloat(value);
		}
		var paramIndex = 0;
		if(this.selected_model.type == '1stord') {
			if     (name == 'k'    ) { paramIndex = 0; }
			else if(name == 'tao'  ) { paramIndex = 1; }
			else if(name == 'theta') { paramIndex = 2; }
			else if(name == 'y0'   ) { paramIndex = 3; }
			else { console.warn('Unknown param ', name); return; }
		}
		else if(this.selected_model.type == '2ndord') {
			var a1    = this.selected_model.params[0];
			//var a2    = this.selected_model.params[1];
			//var b     = this.selected_model.params[2];
			//var theta = this.selected_model.params[3];
			//var y0    = this.selected_model.params[4];
			// frequency and damping
			var w     = Math.sqrt(-a1);
			//var gi    = -a2/(2*w);
			//var k     = -b/a1;
            if(name == 'k') {
                // b = -k * a1
                value = -value * a1;
                paramIndex = 2;
            }
			else if(name == 'w') { 
			    // a1 = -w^2
			    value = -value * value;
			    paramIndex = 0;
			}
			else if(name == 'gi') { 
			    // a2 = -2 * gi * w
			    value = - 2 * value * w;
			    paramIndex = 1;
			}
			else if(name == 'theta') { 
			    paramIndex = 3;
			}
			else { console.warn('Unknown param ', name); return; }
		}
		else if(this.selected_model.type == 'integ') {
			if     (name == 'k'    ) { paramIndex = 0; }
			else if(name == 'theta') { paramIndex = 1; }
			else if(name == 'y0'   ) { paramIndex = 2; }
			else { console.warn('Unknown param ', name); return; }
		}
		else if(this.selected_model.type == 'integlag') {
			if     (name == 'k'    ) { paramIndex = 0; }
			else if(name == 'tao'  ) { paramIndex = 1; }
			else if(name == 'theta') { paramIndex = 2; }
			else if(name == 'y0'   ) { paramIndex = 3; }
			else { console.warn('Unknown param ', name); return; }
		}
		else if(this.selected_model.type == 'integdouble') {
			if     (name == 'k'    ) { paramIndex = 0; }
			else if(name == 'theta') { paramIndex = 1; }
			else if(name == 'y0'   ) { paramIndex = 2; }
			else { console.warn('Unknown param ', name); return; }
		}
		else {
            console.warn('Unknown model.');
            return;
		}
		Vue.set(this.selected_model.params, paramIndex, value);
    }, // updateParam
    syncLogicEnter: async function(event, param) {
    	param.insync = true; 
    	var value = event.target.value;
    	if(typeof value == "string") {
			value = parseFloat(value);
		}
    	this.updateParam(param.name, value);
    	Vue.set(param, 'val', value);
    	this.$emit('latestStep');
        // update in worker
		var result = await PidWorker.simulateModel({
			uniform_time   : this.uniform_time  ,
			uniform_input  : this.uniform_input ,
			uniform_output : this.uniform_output,
			type           : this.selected_model.type,
			params         : this.selected_model.params,
		});
		// update 
		Vue.set(this.selected_model, 'y', result.y);
		this.selected_model.y = result.y;
    },
    syncLogicKeyUp(event, param) {
    	var value = event.target.value;
    	if(typeof value == "string") {
			value = parseFloat(value);
		}
    	if(value != param.val && (param.insync === undefined || param.insync)) { 
    	    param.insync = false; 
    	    param.oldVal = event.target.value; 
		}
    },
    resetModels: async function() {
    	// emit step paused (start loading animation)
        this.$emit('stepPaused');
    	// clear cache
    	this.cached_model_list.splice(0, this.cached_model_list.length);
    	this.selected_model.y.splice(0, this.selected_model.y.length);
    	// load or create model_list
  	    this.model_list.copyFrom(await this.getModelList());
    },
  }, // methods
  watch: {
  	selected_model: function() {
  		this.modelUpdated();
  	}
  } // watch
};

// ------------------------------------------------------------------------
return SelectModelView;
}