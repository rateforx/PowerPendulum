"use strict";

let scene; // three scene
let world; // cannon world
let renderer;
let camera; // perspective camera
let light;
let ambient;
let controls; // orbit controls
let backgroundColor = 0;

let dt = 1 / 60;

let pendulumBase; // static physical base of the pendulum
let pendulum1Physics, pendulum1, pendulum1Mass = Math.random() * 10, pendulum1Color = Math.random() * 0xffffff; // first pendulum physics and graphics objects, mass
let pendulum2Physics, pendulum2, pendulum2Mass = Math.random() * 10, pendulum2Color = Math.random() * 0xffffff; // second pendulum physics and graphics objects, mass

let distanceConstraint1, distanceConstraint2; // physics constraints acting as the pendulum "arms"
let arms; // graphical line object representing arms
let armsColor = 0x333333;

let trail; // Three line object representing the second pendulum trail following its movement
let trailColor = 0; // initial hue value of the hsl palette, updated in each trail update step
let trailLength = 150000; // when the grail gets to its maximum length the vertex array gets shifted out
let trailDash = 3;
let trailGap = 1;

let cameraFollowMovement = false;

let pendulum1VelocityArrowHelper, pendulum2VelocityArrowHelper; // velocity arrow helper

const DAMPING = .01; // pendulum linear damping value
const DEBUG = false; // show helpers
const CONTROLS = true; // enable orbit controls
const ARROWS = true; // arrows attached to pendulum showing its velocity

let gui; // dat gui instance
let stats; // fps counter

$( function () {

    function initCannon () {
        world = new CANNON.World();
        world.gravity.set( 0, -10, 0 );
        world.broadphase = new CANNON.NaiveBroadphase();

        let sphereShape = new CANNON.Sphere( 1 );

        pendulumBase = new CANNON.Body( {
            mass: 0,
            shape: sphereShape,
            position: new CANNON.Vec3( 0, 0, 0 ),
        } );

        pendulum1Physics = new CANNON.Body( {
            mass: pendulum1Mass,
            shape: sphereShape,
            position: new CANNON.Vec3(
                Math.random() * 20 - 10,
                Math.random() * 20 - 10,
                Math.random() * 20 - 10,
            ),
            fixedRotation: true,
            linearDamping: DAMPING,
        } );

        pendulum2Physics = new CANNON.Body( {
            mass: pendulum2Mass,
            shape: sphereShape,
            position: new CANNON.Vec3(
                Math.random() * 40 - 20,
                Math.random() * 40 - 20,
                Math.random() * 40 - 20,
            ),
            fixedRotation: true,
            linearDamping: DAMPING,
        } );

        distanceConstraint1 = new CANNON.DistanceConstraint( pendulumBase, pendulum1Physics );
        distanceConstraint2 = new CANNON.DistanceConstraint( pendulum1Physics, pendulum2Physics );

        world.addBody( pendulumBase );
        world.addBody( pendulum1Physics );
        world.addBody( pendulum2Physics );

        world.addConstraint( distanceConstraint1 );
        world.addConstraint( distanceConstraint2 );
    }

    function initThree () {

        scene = new THREE.Scene();
        scene.background = new THREE.Color( backgroundColor );

        renderer = new THREE.WebGLRenderer( {
            antialias: true,
        } );
        renderer.setSize( window.innerWidth, window.innerHeight );

        $( '#viewport' ).append( renderer.domElement );

        camera = new THREE.PerspectiveCamera(
            50, // fov
            window.innerWidth / window.innerHeight, // aspect ratio
            .0001, // near
            2000 // infinite far
        );
        camera.position.set( 0, -15, -50 );
        camera.lookAt( scene.position );

        light = new THREE.PointLight( 0xffffff, .5, 0, 1 );
        light.position.set( 50, 0, -50 );
        scene.add( light );

        ambient = new THREE.AmbientLight( 0xffffff, .5 );
        scene.add( ambient );

        pendulum1 = new THREE.Mesh(
            new THREE.IcosahedronGeometry( 1, 2 ),
            new THREE.MeshPhongMaterial( {
                color: pendulum1Color,
            } ),
        );
        pendulum1.scale.setScalar( pendulum1Mass / 2 );

        pendulum2 = new THREE.Mesh(
            new THREE.IcosahedronGeometry( 1, 2 ),
            new THREE.MeshPhongMaterial( {
                color: pendulum2Color,
            } ),
        );
        pendulum2.scale.setScalar( pendulum2Mass / 2 );

        trail = new THREE.Line( new THREE.Geometry, new THREE.LineDashedMaterial( {
            color: new THREE.Color( `hsl( ${trailColor}, 100%, 50% )` ),
        } ) );
        // trail.frustumCulled = false;

        let armsGeometry = new THREE.Geometry();
        armsGeometry.vertices.push( new THREE.Vector3() );
        armsGeometry.vertices.push( new THREE.Vector3().copy( pendulum1Physics.position ) );
        armsGeometry.vertices.push( new THREE.Vector3().copy( pendulum2Physics.position ) );
        let armsMaterial = new THREE.LineBasicMaterial( {
            color: armsColor,
        } );
        arms = new THREE.Line( armsGeometry, armsMaterial );

        pendulum1VelocityArrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pendulum1Physics.velocity ), // arrow direction
            new THREE.Vector3().copy( pendulum1Physics.position ), // arrow origin
            pendulum1Physics.velocity.length, // arrow length
            0x567def, // lightblue color
        );

        pendulum2VelocityArrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pendulum2Physics.velocity ), // arrow direction
            new THREE.Vector3().copy( pendulum2Physics.position ), // arrow origin
            pendulum2Physics.velocity.length, // arrow length
            0x567def, // lightblue color
        );

        scene.add( pendulum1 );
        scene.add( pendulum2 );
        scene.add( trail );
        scene.add( arms );
        scene.add( pendulum1VelocityArrowHelper );
        scene.add( pendulum2VelocityArrowHelper );

        if ( DEBUG ) {
            let ah = new THREE.AxesHelper( 20 );
            scene.add( ah );
        }
        if ( CONTROLS ) {
            controls = new THREE.OrbitControls( camera, renderer.domElement );
            controls.autoRotate = false;
            controls.autoRotateSpeed = -1; // default: 2 => 30s rotation
            controls.enableDamping = true;
            // controls.dampingFactor = .5;
            controls.enableKeys = true;
            controls.enablePan = true;
            controls.rotateSpeed = .25;
            controls.minDistance = 50;
        }
    }

    function initGUI () {

        gui = new dat.GUI;

        let settings = {
            pendulum1Mass: pendulum1Mass,
            pendulum2Mass: pendulum2Mass,
            pendulum1Color: pendulum1Color,
            pendulum2Color: pendulum2Color,
            arm1Length: distanceConstraint1.distance,
            arm2Length: distanceConstraint2.distance,
            armsColor: armsColor,
            backgroundColor: backgroundColor,
            trailLength: trailLength,
            trailDash: trailDash,
            trailGap: trailGap,
            cameraFollowMovement: cameraFollowMovement,
        };

        let pendulum1MassController = gui.add( settings, 'pendulum1Mass', .5, 10 );
        pendulum1MassController.onChange( value => {
            pendulum1Physics.mass = value;
            pendulum1.scale.set( value / 2, value / 2, value / 2 );
        } );

        let pendulum2MassController = gui.add( settings, 'pendulum2Mass', .5, 10 );
        pendulum2MassController.onChange( value => {
            pendulum2Physics.mass = value;
            pendulum2.scale.set( value / 2, value / 2, value / 2 );
        } );

        let pendulum1ColorController = gui.addColor( settings, 'pendulum1Color' );
        pendulum1ColorController.onChange( value => {
            pendulum1.material.color = new THREE.Color( value );
        } );

        let pendulum2ColorController = gui.addColor( settings, 'pendulum2Color' );
        pendulum2ColorController.onChange( value => {
            pendulum2.material.color = new THREE.Color( value );
        } );

        let arm1LengthController = gui.add( settings, 'arm1Length', 0, 20 );
        arm1LengthController.onChange( value => {
            distanceConstraint1.distance = value;
        } );

        let arm2LengthController = gui.add( settings, 'arm2Length', 0, 20 );
        arm2LengthController.onChange( value => {
            distanceConstraint2.distance = value;
        } );

        let armsColorController = gui.addColor( settings, 'armsColor' );
        armsColorController.onChange( value => {
            arms.material.color = new THREE.Color( value );
        } );

        let backgroundColorController = gui.addColor( settings, 'backgroundColor' );
        backgroundColorController.onChange( value => {
            scene.background = new THREE.Color( value );
        } );

        let trailLengthController = gui.add( settings, 'trailLength', 0, 150000 ).step( 10 );
        trailLengthController.onChange( value => {
            trailLength = value;
        } );

        let trailDashController = gui.add( settings, 'trailDash', 0, 10 );
        trailDashController.onChange( value => {
            trail.material.dashSize = value;
        } );
        let trailGapController = gui.add( settings, 'trailGap', 0, 10 );
        trailGapController.onChange( value => {
            trail.material.gapSize = value;
        } );

        let cameraFollowMovementController = gui.add( settings, 'cameraFollowMovement' );
        cameraFollowMovementController.onChange( value => {
            cameraFollowMovement = value;
        } );
    }

    function initStats () {

        stats = new Stats();

        document.body.appendChild( stats.dom );
    }

    function draw () {

        window.requestAnimationFrame( draw );
        world.step( dt );

        pendulum1.position.copy( pendulum1Physics.position );
        pendulum2.position.copy( pendulum2Physics.position );

        cameraFollowMovement
            ? camera.lookAt( pendulum2.position )
            : camera.lookAt( scene.position );

        updateArms();
        updateTrail();
        if ( ARROWS ) updateArrows();

        if ( pendulum1Physics.velocity.length === 0 && pendulum2Physics.velocity.length === 0 ) {
            reset();
        }

        renderer.render( scene, camera );

        stats.update();
    }

    function updateArms () {
        arms.geometry.vertices[ 1 ].copy( pendulum1Physics.position );
        arms.geometry.vertices[ 2 ].copy( pendulum2Physics.position );
        arms.geometry.verticesNeedUpdate = true;
    }

    function updateTrail () {
        //update trail color
        if ( trailColor > 359 ) {
            trailColor = 0;
        } else {
            trailColor++;
        }

        // add the last pendulum position vertex
        trail.geometry.vertices.push( new THREE.Vector3().copy( pendulum2Physics.position ) );
        trail.geometry.colors.push( new THREE.Color( `hsl( ${trailColor}, 100%, 50% )` ) );

        if ( trail.geometry.vertices.length > trailLength ) {

            trail.geometry.vertices.splice(
                0,
                trail.geometry.vertices.length - trailLength
            );

            trail.geometry.colors.splice(
                0,
                trail.geometry.colors.length - trailLength
            );
        }
        // recreate the trail object
        scene.remove( trail );

        // replace the geometry
        let geometry = trail.geometry.clone();
        trail.geometry.dispose();
        trail.geometry = geometry;

        let material = new THREE.LineDashedMaterial( {
            dashSize: 1,
            gapSize: 0,
            vertexColors: THREE.VertexColors,
        } );
        trail.material = material;

        // trail = new THREE.Line( geometry, material );
        trail.computeLineDistances();
        trail.name = 'trail';

        scene.add( trail );
    }

    function updateArrows () {
        scene.remove( pendulum1VelocityArrowHelper );
        pendulum1VelocityArrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pendulum1Physics.velocity ), // arrow direction
            new THREE.Vector3().copy( pendulum1Physics.position ), // arrow origin
            pendulum1Physics.velocity.length * 10, // arrow length
            0x567def, // lightblue color
        );
        scene.add( pendulum1VelocityArrowHelper );

        scene.remove( pendulum2VelocityArrowHelper );
        pendulum2VelocityArrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pendulum2Physics.velocity ), // arrow direction
            new THREE.Vector3().copy( pendulum2Physics.position ), // arrow origin
            pendulum2Physics.velocity.length * 10, // arrow length
            0x567def, // lightblue color
        );
        scene.add( pendulum2VelocityArrowHelper );
    }

    function reset () {
        pendulum1Physics.position.set( -10, 0, 0 );
        pendulum2Physics.position.set( -10, 0, -10 );

        trail.geometry.vertices.length = 0;

        updateArms();
        updateTrail();
        updateArrows();
    }

    function onResize () {
        let width = window.innerWidth;
        let height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize( width, height );
    }

    $( window ).resize( onResize );

    // run
    initCannon();
    initThree();
    initGUI();
    initStats();
    window.requestAnimationFrame( draw );

    window.scene = scene;
    window.camera = camera;
    window.vah1 = pendulum1VelocityArrowHelper;
    window.vah2 = pendulum2VelocityArrowHelper;
    window.trail = trail;
} );
