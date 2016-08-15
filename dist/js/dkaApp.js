
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
  
.controller('dkaController', ['$scope','$interval','$sce', dkaController]);




function dkaController($scope,$interval,$sce){
	
	
	
	var myInt = 1;
	$interval(updateRooms, 2000,10);
	
	function random(){
		return Math.ceil(Math.random()*10);
	};
	function updateRooms(){
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
	$scope.queries = [
		{'name':'Query 1',
		'value': 'SELECT ?room ?wifiSignal WHERE { graph ?expiryDateInMs { ?room robo:hasWiFiSignal ?wifiSignal.}.  graph ?static {?room a location:Activity. } } ORDER BY DESC(?t) LIMIT 1'},
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
			
			// send query to server
			
			// while server is busy 
			   // show ... rotating stuff
				
			$scope.results = true;				
			
			// plan?
			plan();
			// then last query
			
			function plan(){
		
				var plan = [{name : 'Go', executed : false,  executing : false}, {name : 'To' , executed : false,  executing : false}, {name : "The",  executed : false,  executing : false}, {name: "Kitchen", executed : false,  executing : false}];
		
				$scope.plan = plan;

				var index = 0;
				var lastAction = '';
				$interval(callAtInterval, 2000, $scope.plan.length+1);
		
		
				function callAtInterval() {
			
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
