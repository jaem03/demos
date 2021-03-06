//init vars
var num_clusters = 0;

var width = 1300,
  height = 600,
  padding = 5, // separation between nodes
  m = 10; // number of distinct clusters

var inital_filter_clustering_colors_by = "Attrition";

// var color = d3.scale.category10().domain(d3.range(m));
// var color = {"#FF4136":0,"#3D9970":0};
var color = {
  "Yes":{color:"#FF4136",count:0},
  "No":{color:"#3D9970",count:0}
};

var x = d3.scale.ordinal()
  .domain(d3.range(m))
  .rangePoints([0, width], 1);

var svg = d3.select("#chart").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("text-align", "center")
  ;

//make nodes, set initial cluster, but more importantly nodes color
computer_categories = data_filter(inital_filter_clustering_colors_by)[0];
var nodes = d3.range(_data.length).map(function(i) {
  var cluster_id = computer_categories[ _data[i][inital_filter_clustering_colors_by] ][0];
  color[ _data[i][inital_filter_clustering_colors_by] ].count++;

  return {
    radius: 4,
    color: color[ _data[i][inital_filter_clustering_colors_by] ].color,
  };

});

var force = d3.layout.force()
  .nodes(nodes)
  .size([width, height])
  .gravity(0)
  .charge(0)
  .on("tick", tick)
  .start();

var circle = svg.selectAll("circle")
  .data(nodes)
  .enter().append("circle")
  .attr("r", function(d) { return d.radius; })
  .style("fill", function(d) { return d.color; })
  .call(force.drag);

// when nodes move
function tick(e) {
  circle
    .each(gravity(.2 * e.alpha))
    .each(collide(.1))
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; });
}

// Move nodes toward cluster focus.
function gravity(alpha) {
  return function(d) {
    d.y += (d.cy - d.y) * alpha;
    d.x += (d.cx - d.x) * alpha;
  };
}

// Resolve collisions between nodes.
function collide(alpha) {
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
    var r = d.radius + padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
        if (l < r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}

function data_filter(attribute){
  var computer_categories = {};
  var total = 0;
  for(i in _data){
    if(!( _data[i][attribute] in computer_categories )){
      computer_categories[_data[i][attribute]] = [Object.keys(computer_categories).length,0];
    }
    computer_categories[_data[i][attribute]][1]++;
    total++;
  }
  num_clusters = Object.keys(computer_categories).length;
  return [computer_categories,total]
}

function change_cluster(attribute){
  force.stop();

  data = data_filter(attribute);
  computer_categories = data[0];
  total = data[1];

  var gravity_point = [];
  var num_of_parts = Math.ceil(num_clusters/2);
  var at_part = 0;
  var at_cluster = 0;

  d3.selectAll(".title").remove();
  //find each cluster gravity point and print its label
  for(var i in computer_categories){
    x = ((width/num_of_parts)/2)+((width/num_of_parts)*at_part);

    if(at_part==num_of_parts-1 && num_clusters%2==1){
      gravity_point.push( {x: x, y: ((height-100)/2)+80 } );
    }
    else if(at_cluster%2==0 && at_part%2==1){
      gravity_point.push( {x: x, y: ((height-100)/2/2)+100 } );
    }else if(at_cluster%2==1 && at_part%2==1){
      gravity_point.push( {x: x, y: ((height-100)/2)+((height-100)/2/2)+100 } );
      at_part++;
    }else if(at_cluster%2==0 && at_part%2==0){
      gravity_point.push( {x: x, y: ((height-100)/2/2)+50 } );
    }else if(at_cluster%2==1 && at_part%2==0){
      gravity_point.push( {x: x, y: ((height-100)/2)+((height-100)/2/2)+50 } );
      at_part++;
    }

    at_cluster++;
  }

  //update centriod for each nodes
  var cluster_count_innerclusters = {};
  for(i in _data){
    nodes[i].cluster_id = computer_categories[ _data[i][attribute] ][0];
    nodes[i].cx = gravity_point[nodes[i].cluster_id].x,
    nodes[i].cy = gravity_point[nodes[i].cluster_id].y;

    if(!(nodes[i].cluster_id in cluster_count_innerclusters)){
      cluster_count_innerclusters[nodes[i].cluster_id.toString()] = {};
    }
    if(!( nodes[i].color in cluster_count_innerclusters[nodes[i].cluster_id.toString()] )){
      cluster_count_innerclusters[nodes[i].cluster_id.toString()][nodes[i].color.toString()] = 0;
    }
    cluster_count_innerclusters[nodes[i].cluster_id.toString()][nodes[i].color.toString()]++;
  }

  for(var i in computer_categories){
    var this_text = svg.append("text")
      .attr("class", "title")
      .attr("fill", "#0074D9")
      .attr("x", gravity_point[computer_categories[i][0]].x-100)
      .attr("y", gravity_point[computer_categories[i][0]].y-50)
      .text(i+": "+computer_categories[i][1]+" ("+parseInt(computer_categories[i][1]/total*1000)/10+"%)");

    for(j in cluster_count_innerclusters[ computer_categories[i][0] ]){
      var percentage = parseInt( cluster_count_innerclusters[ computer_categories[i][0] ][j] / computer_categories[i][1] *1000)/10;
      var tspan1 = this_text.append('tspan')
        .attr("fill", j)
        .attr("dx", -110)
        .attr("dy", 20)
        .text(cluster_count_innerclusters[ computer_categories[i][0] ][j]+'/'+computer_categories[i][1]+' ('+percentage+'%) ');

    }
  }

  document.getElementById('current_selected').innerHTML = attribute;
  force.start();
}

change_cluster(inital_filter_clustering_colors_by);
