
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
  
.controller('dkaController', ['$scope','$interval','$sce', '$http',dkaController]);




function dkaController($scope,$interval,$sce,$http){
	
	// at the startup, we should have something that try to contact the robot and the kb server

	var myInt = 1;
	$interval(updateRooms, 2000,10);
	
	function random(){
		return Math.ceil(Math.random()*10);
	};
	function updateRooms(){
		
		// GET KB STATUS
		// var globalQuery = query to ask for everything: temp, hum, wifi, people, validity for every room
		// $http({
		//   method: 'GET',
		//   url: 'http://10.229.170.105:8080/query', // url should be loaded from a conf file
		//   headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		//   params: {query: globalQuery}
		// }).then(function successCallback(response) {
		//		// parse query response and do stuff
		//   }, function errorCallback(response) {
		// 	  	alert("Problems while contacting the KB server");
		//   });
		
		// Maybe this can be put in another method, that is called more frequently
		// ASK ROBOT WHERE IT IS: to be used to update the position of the robot
		// watchout, with Chrome there might be proble with the Access-Control-Allow-Origin
		//     		$http({
		//     		  method: 'GET',
		//     		  url: 'http://10.229.170.105:5000/whereareyou', // url should be loaded from a conf file
		//     		  headers: {'Content-Type': 'application/x-www-form-urlencoded',
		// 		 	 			"Access-Control-Allow-Origin": "*"}
		//     		}).then(function successCallback(response) {
		//     		    // parse plan response
		// var x = response.data.current_position.x;
		// var y = response.data.current_position.y;
		//   				alert("Current position at [" + x + "," + y + "]");
		//     		  }, function errorCallback(response) {
		//     			  $scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
		//     		  });
		
		myInt = myInt- 0.1; ;
		$scope.colors = ['rgba(0, 180, 48, '+myInt+')','rgba(0, 180, 48, '+myInt+')','rgba(0, 180, 48, '+myInt+')','rgba(0, 180, 48, '+myInt+')'];
		// $scope.rooms.colors = ['rgba(0, 180, 48, '+myInt+')','rgba(0, 180, 48, '+myInt+')','rgba(0, 180, 48, '+myInt+')','rgba(0, 180, 48, '+myInt+')'];
		
		oldRooms = $scope.rooms.rooms;
		newRooms = [];
		for (var roomIx = 0 ; roomIx < oldRooms.length; roomIx++){
			room = oldRooms[roomIx];
			var newData = [];
			for (var value = 0 ; value < room.data.length ; value++){
				
				if (room.data[value] > 0) {
					newVal = Math.floor(room.data[value]-1);
				} else { newVal = 0;}
				newData[value] = newVal;
			}
			room.data = newData;
			$scope.rooms.rooms[roomIx].data =  newData;
			
		}
		
		$scope.invalid = myInt < 0.1 ;	
	}
	
	$scope.colors =  ['rgba(0, 180, 48, 1)','rgba(0, 180, 48, 1)','rgba(0, 180, 48, 1)','rgba(0, 180, 48, 1)'];

	$scope.rooms = {
		bar :  {
			scales : {
				type : 'linear',
				yAxes : [ 
					{ticks : 
						{
						max : 10 , min : 0
						}
				}]
			}
		},
		
		optionsRd : {	
				scale : {
					lineArc : true,
					ticks : {
						min: 0,
						max : 10,
					},
					
					pointLabels : {}
				}
		
			},
		colors :  ['rgba(0, 180, 48, 1)','rgba(0, 180, 48, 1)','rgba(0, 180, 48, 1)','rgba(0, 180, 48, 1)'],
		data : [1,1,1,1],
		labels : ['Temp','Hum','Wifi','Ppl'], 
		rooms : [
			{'name':'Room 22',data : [random(),random(),random(),random()], "left": '357px', top: '654px','w': '58px', 'h':'85px'},
			{'name':'Room 20', data : [random(),random(),random(),random()], "left": '173px', top: '654px','w': '126px', 'h':'79px'},
			{'name':'Markbucks',data : [random(),random(),random(),random()],  "left": '778px', top: '644px','w': '101px', 'h':'150px'},
			{'name':'Podium', data : [random(),random(),random(),random()], "left": '841px', top: '262px','w': '244px', 'h':'274px'},
			{'name':'Activity 2',data : [random(),random(),random(),random()], "left": '61px', top: '248px','w': '80px', 'h':'120px'},
			{'name':'Activity 3',data : [random(),random(),random(),random()],"left": '221px', top: '248px','w': '80px', 'h':'120px'},
			{'name':'Activity 4',data : [random(),random(),random(),random()],"left": '391px', top: '208px','w': '80px', 'h':'120px'},
			{'name':'Activity 5',data : [random(),random(),random(),random()],"left": '551px', top: '208px','w': '80px', 'h':'120px'}
		]
	}

    
	
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
	
	
	
	$scope.queryServer = function(){
			
			// PERFORM QUERY QUERY
			// TODO apparently it does not always take $scope.radioModel
			// or it doesn't update it when someone writes inside the textarea
			// $http({
			//   method: 'GET',
			//   url: 'http://10.229.170.105:8080/query', // url should be loaded from a conf file
			//   headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			//   params: {query: $scope.radioModel}
			// }).then(function successCallback(response) {
			//		// parse query response
			//	    // update the resutl table
			//      // ask for the plan - plan()
			//   }, function errorCallback(response) {
			// 	  $scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
			//   });
		 
			$scope.results = true;				
			
			// we can ask if it's busy here
			
			plan();
			// then last query
			
			function plan(){
				
			  	// GET PLAN
				//   		$http({
				//   		  method: 'GET',
				//   		  url: 'http://10.229.170.105:8080/planner/plan', // url should be loaded from a conf file
				//   		  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				//   		  params: {query: $scope.radioModel}
				//   		}).then(function successCallback(response) {
				//   		    // parse plan response
				//				// do your stuff here
				// alert(response.data);
				//   		  }, function errorCallback(response) {
				//   			  $scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
				//   		  });
				
				// this must be called inside the successCallback method of the GET PLAN
			  	// SEND QUERY FOR PLAN
				// shouldn't the send be a POST????
				// $http({
				//   	method: 'GET',
				//   	url: 'http://10.229.170.105:8080/bot/send', // url should be loaded from a conf file
				//   	headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				//   	params: {query: $scope.radioModel}
				//  }).then(function successCallback(response) {
				//   		    // parse plan response
				// 			// do your stuff here
				// 	alert(response.data);
				//  }, function errorCallback(response) {
				//  	$scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
				//  });
				//
				
				// also all this stuff should be called inside the successCallback method of the GET PLAN
				// parsing the plan 
				var plan = [{name : 'Go', executed : false,  executing : false}, {name : 'To' , executed : false,  executing : false}, {name : "The",  executed : false,  executing : false}, {name: "Kitchen", executed : false,  executing : false}];
		
				$scope.plan = plan;

				var index = 0;
				var lastAction = '';
				
				$interval(callAtInterval, 2000, $scope.plan.length+1);
		
		
				function callAtInterval() {
					
					// ASK ROBOT WHAT ARE YOU DOING: to be used to update the position of the robot
					// watchout, with Chrome there might be proble with the Access-Control-Allow-Origin
					// $http({
					// 		method: 'GET',
					// 		url: 'http://10.229.170.105:5000/do', // url should be loaded from a conf file
					// 		headers: {'Content-Type': 'application/x-www-form-urlencoded',
					// 			 	 	"Access-Control-Allow-Origin": "*"}
					// 	}).then(function successCallback(response) {
					// 		if (response.status == 204) {
					// 			// doing nothing
					// 			alert(response.statusText); //placeholder
					// 		}
					// 		else {
					// 			// TODO we should put an id/counter in the plan so that it can more easily know
					// 			// at which point of the global plan it is
					// 			alert(response.data.name); //placeholder
					// 		}
					// 	}, function errorCallback(response) {
					// 	    $scope.radioModel = "Sorry, problem while sending the reuqest. ERROR " + response.status
					// });
					
					if (lastAction != '' ){
						lastAction.executed = true;
						lastAction.executing = false;
					}
					if (index === $scope.plan.length ){	
						$scope.terminated = true;	
						return;
					}
			
					// current action
					action = $scope.plan[index] ;
					action.executing = true;
			
					index+=1;
					lastAction = action;
			
				}
		
			}
	} ;
	
	
}
