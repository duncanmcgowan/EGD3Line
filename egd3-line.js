/*
 * egd3-line.js
 * 
 * A simple multi-line D3-based line chart
 * 
 * Requires jQuery 1.11.1+
 * 
 * (C) Duncan McGowan 2016
 */

function EGD3Line(args)
{
 
   this.chart           = null;
   this.data            = null;
   this.container       = args.container        || null;
   
   // API >>>
   
   this.margin          = args.margin           || {top: 10, right: 20, bottom: 60, left: 50};
   this.scaled_margin   = this.margin;
   this.legend          = args.legend           || null;
   this.interpolate     = args.interpolate      || false;
   this.x_axis_title    = args.x_axis_title     || "x";
   this.y_axis_title    = args.y_axis_title     || "y";
   this.horizontal_grid = args.horizontal_grid  || false;
   this.vertical_grid   = args.vertical_grid    || false;
    
   this.exception       = function(obj) { return function(message) { this.message = message; this.name = "Exception" } }(this);
   
   // Resize function, purely used to set the scale for the tooltip code >>>
   // ------------ //
   
   $(window).on('resize', function(obj) {
      return function()
      {
         obj.calc_scale();
      }
   }(this));
      
   if ( this.container              === null )        throw new this.exception("Missing container");
   if ( typeof this.margin.top      === "undefined" ) throw new this.exception("Missing top in margin");
   if ( typeof this.margin.bottom   === "undefined" ) throw new this.exception("Missing bottom in margin");
   if ( typeof this.margin.left     === "undefined" ) throw new this.exception("Missing left in margin");
   if ( typeof this.margin.right    === "undefined" ) throw new this.exception("Missing right in margin");
      
   this.min_y           = args.min_y || 0;
   this.max_y           = args.max_y || 100;
   this.x_key           = args.x_key || 'x';
      
   this.original_width  = $("#"+this.container).width();
   this.width           = this.original_width - (this.margin.right + this.margin.left);
   this.height          = null;
   this.scale           = 1.0;
   
   this.calc_scale = function(obj)
   {
      /*
       *    As this is a responsive wrapper around D3, we catch window resize events but only to implement an
       *    internal scale value, primarily for displaying the non-D3/non-SVG tooltip
       */
      return function()
      {
         var new_width = $("#"+obj.container).width();
         obj.scale = new_width / obj.original_width;
         obj.scaled_margin = { 
               left     : obj.margin.left * obj.scale, 
               right    : obj.margin.right * obj.scale, 
               top      : obj.margin.top * obj.scale, 
               bottom   : obj.margin.bottom * obj.scale };
      }
   }(this);
   
   
   this.calc_scale();
      
   // Aspect ratio or height must be defined
   
   if ( typeof args.height_percent !== "undefined" )
      this.height = ((this.width/100) * parseInt(args.height_percent)) - (this.margin.top + this.margin.bottom)
   else if ( typeof args.aspect_ratio !== "undefined" )
      // Should be specified as a floating point number
      this.height = (this.width / parseFloat(args.aspect_ratio)) - (this.margin.top + this.margin.bottom)
   else
      throw new this.exception("No height (percent) or aspect ratio defined");
   
   if ( this.height <= (this.margin.top + this.margin.bottom) )
      this.height = (this.margin.top + this.margin.bottom) + 20;
         
   this.x_scale   = d3.scale.linear().range([0, this.width]);
   this.y_scale   = d3.scale.linear().range([this.height,0]).nice();
   
   /*
    * X axis and vertical gridlines (if selected) >>>
    */
   
   if ( this.vertical_grid === false )
   {
      this.x_axis = d3.svg.axis().scale(this.x_scale).tickFormat(d3.format("d")).orient("bottom");
      this.x_axis.ticks ( Math.max(this.width/50, 2) );
   }
   else
      this.x_axis = d3.svg.axis()
         .scale(this.x_scale)
         .tickFormat(d3.format("d"))
         .orient("bottom")
         .innerTickSize(-this.height)
         .outerTickSize(0)
         .tickPadding(10);
   
   /*
    * Y axis and horizontal gridlines (if selected) >>>
    */
   
   this.y_scale.domain([0, this.max_y]);
   if ( this.horizontal_grid === false )
   {
      this.y_axis = d3.svg.axis().scale(this.y_scale).orient("left");
      this.y_axis.ticks ( Math.max(this.height/50, 2) );
   }
   else
      this.y_axis = d3.svg.axis()
                     .scale(this.y_scale)
                     .orient("left")
                     .innerTickSize(-this.width)
                     .outerTickSize(0)
                     .tickPadding(10);
            
   
   this.attach_data = function(obj)
   {
      /*
       * Attach data to this object >>>
       */
      return function(data) 
      {
         obj.data = data;
         obj.x_scale.domain(d3.extent(obj.data, function(d) { return d[obj.x_key] }));
      }
   }(this);
      
   
   this.draw_chart = function(obj)
   {
      /*
       *    Renders the base chart, setting up the SVG canvas, the viewbox, the axes, a trival point marker
       *    and the voronoi regions container for capturing mouse events 
       */
      return function()
      {            
         obj.chart = d3.select("#"+this.container)
         .append("svg")
            .attr("preserveAspectRatio", "xMinYMin slice")
            .attr("viewBox", "0 0 " + (obj.width+obj.margin.right+obj.margin.left) + " " + (obj.height+obj.margin.top+obj.margin.bottom) )
         .append("g")
            .attr("id","inner-chart")
            .attr("transform", "translate(" + obj.margin.left + "," + obj.margin.top + ")");
            
         // This is the highlight 'blob' that follows the mouse cursor along each line. Some style properties
         // are altered in draw_line()
         obj.chart.append("circle")
            .attr("id","eg-marker")
            .attr("r",1.5)
            .style({"display":"none"});
           
         var dsp = (obj.width < 100) ? "none" : "null";

         /*
          * X Axis
          * Use class 'eg-xy-axis-tick' if horizontal grid is true
          */
         
         var sel = obj.chart.append("g")
                     .attr("class", "x axis")
                     .attr("transform", "translate(0," + obj.height + ")")
                     .style("display",dsp);
         
         if ( obj.vertical_grid === true )
            sel.attr("class", "eg-xy-axis-tick");
         
         sel.call(obj.x_axis)
            .append("text")
               .text(obj.x_axis_title)
               .attr("text-anchor", "middle")
               .attr("y", 40 )
               .attr("x", obj.width/2 );
         
         /* Y Axis
          * Use class 'eg-xy-axis-tick' if horizontal grid is true
          */
         
         var sel = obj.chart.append("g")
                     .attr("class", "y axis")
                     .style("display",dsp);
         
         if ( obj.horizontal_grid === true )
            sel.attr("class", "eg-xy-axis-tick");
         
         sel.call(obj.y_axis)
            .append("text")
               .attr("transform", "rotate(-90)")
               .attr("y", -30 )
               .attr("x", -(obj.height/2) )
               .style("text-anchor", "middle")
               .text(obj.y_axis_title);
            
         /*
          * Voronoi group (container for tessellation paths)
          */
         
         obj.voronoi = d3.geom.voronoi()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            .clipExtent([[0,0], [obj.width, obj.height]]);
            
         obj.voronoi_group = obj.chart.append("g")
            .attr("class", "voronoi");
                  
      }
   }(this);
      
   
   this.sample = function(obj)
   {
      /*    A function for travsersing an interpolated SVG path and returning an array of
       *    points. Can be used for a voronoi mesh. Do not use when interpolate=false
       */
      return function(path,y_key)
      {
         var len = path.getTotalLength();         
         var precision = len / path.pathSegList.numberOfItems / 2;
         var samples = [];
                    
         for ( var sample, sample_len=0; sample_len <= len; sample_len += precision) 
         {
            sample = path.getPointAtLength(sample_len);
            samples.push([sample.x, sample.y, y_key]);
         }
         return samples;
      }
   }(this);
      
   
   this.draw_lines = function(obj)
   {
      /*    Draws the line(s). This function renders the SCG paths but also sets up the voronoi mesh and the
       *    mouse event handlers.
       *    
       *    If 'legend' is defined, draws a legend in the specified position.
       */
      return function(lines)
      {
         var paths = [], point_data = [];
           
         for ( var curr_line=0; curr_line<lines.length; curr_line++ )
         {
            if ( typeof lines[curr_line].y_key === "undefined" )
               throw new obj.exception("Missing y_key");
            
            var y_key = lines[curr_line].y_key;
            var class_name = (lines[curr_line].class_name !== "undefined") ? lines[curr_line].class_name : "";
            var line_data = [];
            
            // ES6 ComputedPropertyName (ie, this won't work on ES5)
            
            for ( var i=0; i<obj.data.length; i++ )
               line_data.push( { [obj.x_key]: parseInt(obj.data[i][obj.x_key]), value: parseFloat(obj.data[i][y_key]) } );
               
            var line = d3.svg.line()
               .x(function(d) { return obj.x_scale(d[obj.x_key]); })
               .y(function(d) { return obj.y_scale(d.value); });
            
            if ( obj.interpolate === true )
               line.interpolate("cardinal");
               
            var path = obj.chart.append("path")
               .datum(line_data)
               .attr("class", class_name + " eg-line" )
               .attr("d", line);
            
            paths.push({path:path, y_key:y_key, stroke: $("."+class_name).css("stroke") });
         }
                        
         // Voronoi data - note that the data added to to the point_data array includes the data that will
         // eventually appear in the tooltip
         
         for ( var i=0; i<paths.length; i++ )
         {
            var v = [];
            
            if ( obj.interpolate )
               v = obj.sample ( paths[i].path.node(), paths[i].y_key);
            else
               for ( var x=0; x<obj.data.length; x++ )
                  v.push( [obj.x_scale(obj.data[x][obj.x_key]), obj.y_scale(obj.data[x][paths[i].y_key]), null ] );
                        
            for ( var j=0; j<v.length; j++ )
               point_data.push({ 
                  [obj.x_key]  : Math.floor(obj.x_scale.invert(v[j][0])+0.5),
                  value : obj.y_scale.invert(v[j][1]),
                  x     : v[j][0],
                  y     : v[j][1],
                  y_key : paths[i].y_key,
                  stroke: paths[i].stroke
                  });
         }
            
         // Render the voronoi tessellation
         var v_data = obj.voronoi(point_data);
         obj.voronoi_group.selectAll("path")
         .data(v_data)
         .enter().append("path")
           .attr("class","voronoi-path")
           .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
           .style({"fill":"#ffffff", "stroke":"#9c9c9c", "stroke-width": "1px", "opacity":"0.1" })
           .datum(function(d) { return d.point; })
           .on("mouseover", obj.mouseover )
           .on("mouseout", obj.mouseout);
         
         // For each point on the line, create an animated circle that will dynamically denote the point
         // when the region is entered with the mouse - see the 'line-point' CSS class
         var points = obj.chart.selectAll("circle").data(point_data);
                  
         points.enter()
            .append("circle")
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            .attr("class","line-point")
            .attr("id", function(d,i) { return "point-" + i.toString(); })
            .style("stroke", function (d) { return d.stroke; } )
            .style({"fill": "none"})
            .attr("r", 0);
      }
   }(this);
               
   
   this.mouseover = function(obj)
   {
      /*
       *    Mouseover event handler - transition the associated line point and call the tooltip function
       */
      return function(d,i)
      {
         // Point marker >>>
         d3.select("#eg-marker").attr("cx",d.x).attr("cy",d.y).style({"fill":d.stroke, "display":null});
         // Grow circle highlight >>>
         d3.select("#point-"+i.toString()).transition().duration(250).attr("r",7);
         var formatter = d3.format(".02f");                  
         obj.tooltip.show ( [d.x, d.y], obj.x_key + ": " + d[obj.x_key] + "<br>" + d.y_key + ": " + formatter(d.value) );
      }
   }(this);
      
   
   this.mouseout = function(obj)
   {
      /*
       *    Mouseout event handler - transition the line point (to invisible) and remove the tooltip
       */
      return function(d,i)
      {
         // Hide marker >>>
         d3.select("#eg-marker").style({"display":"none"});
         // Shrink circle highlight >>>
         d3.select("#point-"+i.toString()).transition().duration(250).attr("r",0);
         obj.tooltip.hide();
      }
   }(this);
   
   
   this.tooltip = {};
   this.tooltip.show = function(obj)
   {
      /*
       *    Set up the tooltip. This is a simple div element external to the SVG canvas, so works using absolute positioning. Note
       *    that x,y positions entering this function are SVG coords, so need to be scaled if the chart has been resized
       */
      return function ( pos, content )
      {
         var container = $("<div class='eg-tooltip'>");
         container.html(content);
         container.css ( { left: -1000, top: -1000, opacity: 0 } );
         container.appendTo('#'+obj.container);
      
         var height = container.height() + parseInt(container.css('padding-top'))  + parseInt(container.css('padding-bottom')),
         width = container.width() + parseInt(container.css('padding-left'))  + parseInt(container.css('padding-right')),
         windowWidth = $(window).width(),
         windowHeight = $(window).height(),
         scrollTop = $('body').scrollTop(),  //TODO: also adjust horizontal scroll
         left, top;
      
         left = (parseInt(pos[0]) - (width / 2)) + obj.scaled_margin.left;
         top = parseInt(pos[1]) - height - 20;
         if (left < 0) left = 5;
         if (left + width > windowWidth) left = windowWidth - width - 5;
         if (scrollTop > top) top = parseInt(pos[1]) + 20;
               
         container.css( { left: left*obj.scale, top: top*obj.scale, opacity: 1 });
      }
   }(this);
   
   
   this.tooltip.hide = function ()
   {
      var tooltip = $('.eg-tooltip');
      tooltip.remove();
   };
      
}
