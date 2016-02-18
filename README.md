# EGD3Line

### A reusable wrapper around a D3 multiline chart

EGD3Line provides a really fast way to create line charts with D3. The main features are;

<ol>
<li>It is responsive, using SVG's *AspectRatio* property and so integrates into Bootstrap;</li>
<li>It is reusable; multiple charts can be used in a single page with completely different data and properties;</li>
<li>It allows any number of lines;</li>
<li>It uses independent CSS and not inline styles;</li>
<li>It includes a simple popup based on a Voronoi mesh;</i>
<li>It exposes a simple API;</li>
<li>It uses an external data source enabling pre-display manipulation.</li>
</ol>

Example of use;

```
$.ajax(
   {
      url         : "/charts/?limit=960",
      type        : "get",
      dataType    : "json",
      success     : function(data)
      {
         var max_y = d3.max(data.data, function(d) {
            return parseFloat(d.tmax);
         });

         try
         {
            var line_chart = new EGD3Line({
               container       : 'responsive-container',
               margin          : {top: 10, right: 10, bottom: 40, left: 50},
               max_y           : Math.round(max_y + Math.ceil(2)),
               min_y           : 0,
               x_key           : 'year',
               x_axis_title    : 'Year',
               y_axis_title    : 'Temp \u2103 (annualised)',
               interpolate     : false,
               aspect_ratio    : 1.667,
               horizontal_grid : true,
               vertical_grid   : true
            });

            line_chart.attach_data(data.data);
            line_chart.draw_chart();
            line_chart.draw_lines ([
               {y_key: 'tmin', class_name: 'line-tmin' },
               {y_key: 'tmax', class_name: 'line-tmax' } ]);
         }
            catch(e)
         {
            console.log(e.name + ", " + e.message);
         }
      }
   });
```

&copy; Duncan McGowan 2016
