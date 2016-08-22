
angular.module('dkaApp', ['ui.bootstrap','swd.inspector-gadget','chart.js'
])	

.config(['ChartJsProvider', function (ChartJsProvider) {
    // Configure all charts
    ChartJsProvider.setOptions({
      // responsive: false,
	// maintainAspectRatio: false,
    scaleOverride: false,
	scaleOverlay: false,
    scaleSteps: 5,
    scaleStepWidth: 1,
    scaleStartValue: 0
    });
    
  }])
  
.controller('dkaController', ['$scope','$interval','$sce', '$http','$timeout',dkaController]);

function dkaController($scope,$interval,$sce,$http,$timeout){
	
	// used to monitor the plan execution, and to stop the monitoring when it's required
	var planExecutionMonitoringPromise;
	
	// loading the property validity time file
	// TODO: this should be replaced with a call to the server that
	// serves this information
	$scope.configfile = null;
	$http.get('propertyValidity.json')
		.success(function(data) {
			$scope.configfile = data;
			
			// adding generalproperties to each room
			angular.forEach($scope.configfile.rooms,function(room) {
				room["properties"] = {};
				angular.forEach($scope.configfile.generalproperties,function(value,key) {
					room["properties"][key] = {};
					angular.forEach($scope.configfile.generalproperties[key],function(subvalue,subkey) {					
						room["properties"][key][subkey] = subvalue;
	 				});
 				});
			});
		})
	  	.error(function(data,status,error,config){
			alert("Cannot load time validity: " + error);
		})

		
	// at the startup, we should have something that try to contact the robot and the kb server
	
	var myInt = 1;
	updateRooms();
	$interval(cycle, 2000);
	
	function random(){
		return Math.ceil(Math.random()*10);
	};
	
	function getURIName(uri) {
		return uri.substr(uri.lastIndexOf('/')+1)
	}

	function cycle() {
		updateRooms();
	}
	
	function updateRooms(){
		var updateQuery = "SELECT ?room ?validityGraph ?prop ?val where { graph ?validityGraph { ?room ?prop ?val } . graph <http://data.open.ac.uk/kmi/graph/static> {?room a <http://data.open.ac.uk/kmi/robo/Location> } . FILTER (?validityGraph != <http://data.open.ac.uk/kmi/graph/static> ) } ORDER BY ?room";
		
		// GET KB STATUS
		// var globalQuery = query to ask for everything: temp, hum, wifi, people, validity for every room
		$http({
			method: 'GET',
			url: 'http://10.229.170.105:8080/query', // url should be loaded from a conf file
			headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept':'application/json'},
			params: {query: updateQuery}
		}).then(function successCallback(response) {
			// TODO there is information about the Activity 6
			// in the KB
			var vars = response.data.vars;
			var items = response.data.items;		
			var now = Date.now();
			
			angular.forEach(items,function(item) {

				var room = getURIName(item.room);
				var curRoom = $scope.configfile.rooms[room];
				
				if(curRoom != null) {
				
					var property = getURIName(item.prop);
					var isValidUntil = parseInt(getURIName(item.validityGraph));
				
					var value = getURIName(item.val);
				
					if(item.val.includes("^^")) {
						value = item.val.split("\^\^")[0];
					}
				
					var remainingTime = isValidUntil - now;
					var percentageOfRemainingTime = remainingTime/(curRoom[property]*1000);
				
					// this should never happen. 
					// only for debugging
					if(percentageOfRemainingTime > 1) {
						percentageOfRemainingTime = 1;
					}

					var transparcencyValue = percentageOfRemainingTime;

					if(remainingTime > 0) {
						curRoom.properties[property].color = 'rgba(0, 180, 48, '+transparcencyValue+')';
						curRoom.properties[property].value = value;
						curRoom.properties[property].validity = true;
					}
					else {
						curRoom.properties[property].validity = false;
						curRoom.properties[property].value = "NV";
					}	
				}
			});
		}, function errorCallback(response) {
				alert("Problems while contacting the KB server");
		});

		// Maybe this can be put in another method, that is called more frequently
		// ASK ROBOT WHERE IT IS: to be used to update the position of the robot
		// watchout, with Chrome there might be proble with the Access-Control-Allow-Origin
		$http({
		    method: 'GET',
		    url: 'http://10.229.170.105:8080/bot/wru', // url should be loaded from a conf file
		    headers: {'Content-Type': 'application/x-www-form-urlencoded',
				 	 "Access-Control-Allow-Origin": "*"}
		    	}).then(function successCallback(response) {
		    		 // parse plan response
					var x = response.data.current_position.x;
					var y = response.data.current_position.y;
		    	}, function errorCallback(response) {
		    		alert("[ROBOT] Sorry, the robot is not responding")
		    	});
	}
	
	// $scope.rooms = {
// 		bar :  {
// 			scales : {
// 				type : 'linear',
// 				yAxes : [
// 					{ticks :
// 						{
// 						max : 10 , min : 0
// 						}
// 				}]
// 			}
// 		},
//
// 		optionsRd : {
// 				scale : {
// 					lineArc : true,
// 					ticks : {
// 						min: 0,
// 						max : 10,
// 					},
//
// 					pointLabels : {}
// 				}
// 			},
// 	}
	
	// TODO load them from somewhere else
	// queries are not compliant with URLs
	$scope.queries = [
		{'name':'Query 1',
		'value': 'select ?room ?temp where {graph ?expiryDateInMs { VALUES(?room) { ( <http://data.open.ac.uk/kmi/location/Podium> ) (<http://data.open.ac.uk/kmi/location/MarkBucks>) } ?room <http://data.open.ac.uk/kmi/robo/hasTemperature> ?temp. } }'},
		{ 'name': 'Query 2',
		  'value' : 'SELECT ?room ?temp WHERE { graph ?expiryDateInMs { VALUES(?room) {(location:Room20 ) (location:Room22)}.  ?room robo:hasTemperature ?temp.  }}'
	    }, 
		{'name':'Query 3',
		 'value':'SELECT ?room ((?temp+?h)/?ppl) AS ?comfort) WHERE { graph ?g { ?room robo:hasPeopleCount ?ppl }.  graph ?g1 {?room robo:hasHumidity ?h }. graph ?g2 {?room robo:hasTemperature ?temp }. graph ?g3 {?room a location:MeetingRoom } } ORDER BY DESC(?t) LIMIT 1	'
		}, 
		{ 	'name':'Query 4',
			'value':'SELECT ?room ((?temp+?h)/?ppl) AS ?comfort) WHERE { graph ?g { VALUES(?room) {(location:Room22) (location:Podium)}. ?room robo:hasPeopleCount ?ppl }.  graph ?g1 { VALUES(?room) {(location:Room22) (location:Podium)}. ?room robo:hasHumidity ?h }. graph ?g2 { VALUES(?room) {(location:Room22) (location:Podium)}. ?room robo:hasTemperature ?temp }.} ORDER BY DESC(?t) LIMIT 1 '
		}];
	
	$scope.results = false;
	
	$scope.startPlanExecutionMonitoring = function() {
	      // stops any running interval to avoid two intervals running at the same time
	      $scope.stopPlanExecutionMonitoring(); 
      
	      // store the interval promise
	      planExecutionMonitoringPromise = $interval($scope.updatePlanExecution, 1000);
	};
	
	// stops the interval
	$scope.stopPlanExecutionMonitoring = function() {
	      $interval.cancel(planExecutionMonitoringPromise);
	};
	
	$scope.updatePlanExecution = function(){ 
				// ASK ROBOT WHAT ARE YOU DOING: to be used to update the position of the robot
				// watchout, with Chrome there might be proble with the Access-Control-Allow-Origin
				$http({
						method: 'GET',
						url: 'http://10.229.170.105:8080/bot/doing', // url should be loaded from a conf file
						headers: {'Content-Type': 'application/x-www-form-urlencoded'}
					}).then(function successCallback(response) {
						if (response.data == "") {
							$scope.terminated = true;
							for (var i = 0; i < $scope.plan.length; ++i) {
								$scope.plan[i].executing = false;
								$scope.plan[i].executed = true;
							}
							$scope.stopPlanExecutionMonitoring();
						}
						else {
							// TODO we should put an id/counter in the plan so that it can more easily know
							// at which point of the global plan it is
							
							var curIndex = response.data.index;					
							for (var i = 0; i < curIndex; ++i) {
								$scope.plan[i].executing = false;
								$scope.plan[i].executed = true;
							}
							$scope.plan[curIndex].executing = true;
						}
					}, function errorCallback(response) {
					    $scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
				});
			}
	
	$scope.queryServer = function(){
			plan();
			// PERFORM QUERY QUERY
			// TODO apparently it does not always take $scope.radioModel
			// or it doesn't update it when someone writes inside the textarea
			// $http({
// 			  method: 'GET',
// 			  url: 'http://10.229.170.105:8080/query', // url should be loaded from a conf file
// 			  headers: {'Content-Type': 'application/x-www-form-urlencoded','Accept':'application/json'},
// 			  params: {query: $scope.radioModel}
// 			}).then(function successCallback(response) {
// 				console.log(response.data);
// 				// parse query response
//
// 				// update the resutl table
// 				updateResults(response.data);
// 				console.log("And then I'll send the plan to the robot");
// 			  }, function errorCallback(response) {
// 				  $scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
// 			  });
		 
			$scope.results = true;				
			
			function updateResults() {
				
			}
			
			// we can ask if it's busy here
			
			// then last query
		
			function createPlan(planArray) {
				if(planArray.length > 0) {
					var planListForHtml = [];
		
					for (index in planArray) {
						var curPlanForHtml = {};
						curPlanForHtml["name"] = planArray[index].name;
						curPlanForHtml["executed"] = false;
						curPlanForHtml["executing"] = false;
						planListForHtml.push(curPlanForHtml);
					}
				
					$scope.plan = planListForHtml;
					return true;
				}
				else return false;
			}
			
			function sendPlan() {
			  	// SEND PLAN
				$http({
					method: 'GET',
				  	url: 'http://10.229.170.105:8080/bot/send', // url should be loaded from a conf file
				  	headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				  	params: {query: $scope.radioModel}
				}).then(function successCallback(response) {
					console.log("Successful send " + response.data);
					$scope.terminated = false;
					$scope.startPlanExecutionMonitoring();
				}, function errorCallback(response) {
					$scope.radioModel = "Sorry, problem while sending the request. ERROR " + response.status
				});
			}
			
			function plan(){
				
			  	// GET PLAN
				$http({
					method: 'GET',
				  	url: 'http://10.229.170.105:8080/planner/plan', // url should be loaded from a conf file
				  	headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				  	params: {query: $scope.radioModel}
				}).then(function successCallback(response) {
					if(createPlan(response.data)) {
						sendPlan();
					}
					else {
						console.log("No plan available");
					}
				  	// parse plan response
					// update and/or
					// do your stuff here
					//alert(response.data);
				  }, function errorCallback(response) {
					  if(response.code == 409) {
					  	// TODO robot is busy
					  }
				  	  else {
						  $scope.radioModel = "Sorry, problem while sending the request. ERROR " + response.status;
				  	  }
				});		
			}
	};
	
	
}
