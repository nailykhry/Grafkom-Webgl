function render(gl, scene, timestamp, previousTimestamp) {
 
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(scene.program);

  var delta = (0.125 * Math.PI) / (timestamp - previousTimestamp);

  var light = vec3.fromValues(
    ($('#light-x').val() - 50.0) / 10.0,
    ($('#light-y').val() - 50.0) / 10.0,
    ($('#light-z').val() - 50.0) / 10.0);

  gl.uniform3fv(scene.program.directionalLightUniform, light);

  var rotateX = ($('#rotate-x').val() - 5) / 10;
  var rotateY = ($('#rotate-y').val() - 5) / 10;
  var rotateZ = ($('#rotate-z').val() - 5) / 10;

  mat4.rotate(
    scene.object.modelMatrix, scene.object.modelMatrix, delta,
    [rotateX, rotateY, rotateZ]);
  gl.uniformMatrix4fv(
    scene.program.modelMatrixUniform, gl.FALSE,
    scene.object.modelMatrix);

  var normalMatrix = mat3.create();
  mat3.normalFromMat4(
    normalMatrix,
    mat4.multiply(
      mat4.create(),
      scene.object.modelMatrix,
      scene.viewMatrix));
  gl.uniformMatrix3fv(
    scene.program.normalMatrixUniform, gl.FALSE, normalMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, scene.object.vertexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, scene.object.vertexCount);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.useProgram(null);
  requestAnimationFrame(function(time) {
    render(gl,scene,time,timestamp);
  });
}

function createProgram(gl, shaderSpecs) {
  var program = gl.createProgram();
  for ( var i = 0 ; i < shaderSpecs.length ; i++ ) {
    var spec = shaderSpecs[i];
    var shader = gl.createShader(spec.type);
    gl.shaderSource(
      shader, document.getElementById(spec.container).text
    );
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(shader);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw gl.getProgramInfoLog(program);
  }
  return program;
}
  
function init(object) {

  var surface = document.getElementById('rendering-surface');
  var gl = surface.getContext('experimental-webgl');
  gl.viewport(0,0,surface.width,surface.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  var program = createProgram(
    gl,
    [{container: 'vertex-shader', type: gl.VERTEX_SHADER},
      {container: 'fragment-shader', type: gl.FRAGMENT_SHADER}]);

  gl.useProgram(program);

  program.positionAttribute = gl.getAttribLocation(program, 'pos');
  gl.enableVertexAttribArray(program.positionAttribute);
  program.normalAttribute = gl.getAttribLocation(program, 'normal');
  gl.enableVertexAttribArray(program.normalAttribute);

  var vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, object.vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    program.positionAttribute, 3, gl.FLOAT, gl.FALSE, 
    Float32Array.BYTES_PER_ELEMENT * 6, 0);
  gl.vertexAttribPointer(
    program.normalAttribute, 3, gl.FLOAT, gl.FALSE,
    Float32Array.BYTES_PER_ELEMENT * 6,
    Float32Array.BYTES_PER_ELEMENT * 3);

  var projectionMatrix = mat4.create();
  mat4.perspective(
    projectionMatrix, 0.75, surface.width/surface.height,
    0.1, 100);
  program.projectionMatrixUniform = gl.getUniformLocation(
    program, 'projectionMatrix');
  gl.uniformMatrix4fv(
    program.projectionMatrixUniform, gl.FALSE, 
    projectionMatrix);

  var viewMatrix = mat4.create();
  program.viewMatrixUniform = gl.getUniformLocation(
    program, 'viewMatrix');
  gl.uniformMatrix4fv(
    program.viewMatrixUniform, gl.FALSE, viewMatrix);

  var modelMatrix = mat4.create();
  mat4.identity(modelMatrix);
  mat4.translate(modelMatrix, modelMatrix, [0, 0, -4]);
  program.modelMatrixUniform = gl.getUniformLocation(
    program, 'modelMatrix');
  gl.uniformMatrix4fv(
    program.modelMatrixUniform, gl.FALSE, modelMatrix);

  var normalMatrix = mat3.create();
  mat3.normalFromMat4(
    normalMatrix, mat4.multiply(
      mat4.create(), modelMatrix, viewMatrix));
  program.normalMatrixUniform = gl.getUniformLocation(
    program, 'normalMatrix');
  gl.uniformMatrix3fv(
    program.normalMatrixUniform, gl.FALSE, normalMatrix);

  program.ambientLightColourUniform = gl.getUniformLocation(
    program, 'ambientLightColour');
  program.directionalLightUniform = gl.getUniformLocation(
    program, 'directionalLight');
  program.materialSpecularUniform = gl.getUniformLocation(
    program, 'materialSpecular');
  object.materialAmbientUniform = gl.getUniformLocation(
    program, 'materialAmbient');
  object.materialDiffuseUniform = gl.getUniformLocation(
    program, 'materialDiffuse');
  object.shininessUniform = gl.getUniformLocation(
    program, 'shininess');

  var ambientLightColour = vec3.fromValues(0.2, 0.2, 0.2);
  gl.uniform3fv(
    program.ambientLightColourUniform, ambientLightColour);
  var directionalLight = vec3.fromValues(-0.5,0.5,0.5);
  gl.uniform3fv(
    program.directionalLightUniform, directionalLight);
  var materialSpecular = vec3.fromValues(0.5, 0.5, 0.5);
  gl.uniform3fv(
    program.materialSpecularUniform, materialSpecular);
  gl.uniform1f(
    object.shininessUniform, object.material.shininess);

  gl.uniform1f(
    object.materialAmbientUniform, object.material.ambient);
  gl.uniform1f(
    object.materialDiffuseUniform, object.material.diffuse);

  object.modelMatrix = modelMatrix;
  object.vertexBuffer = vertexBuffer;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.useProgram(null);

  var scene = {
    program: program,
    object: object,
    start: Date.now(),
    projectionMatrix: projectionMatrix,
    viewMatrix: viewMatrix
  };

  requestAnimationFrame(function(timestamp) {
    render(gl, scene, timestamp, 0);
  });
}

function loadMeshData(string) {
  var lines = string.split("\n");
  var positions = [];
  var normals = [];
  var vertices = [];

  for ( var i = 0 ; i < lines.length ; i++ ) {
    var parts = lines[i].trimRight().split(' ');
    if ( parts.length > 0 ) {
      switch(parts[0]) {
        case 'v':  positions.push(
          vec3.fromValues(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          ));
          break;
        case 'vn':
          normals.push(
            vec3.fromValues(
              parseFloat(parts[1]),
              parseFloat(parts[2]),
              parseFloat(parts[3])));
          break;
        case 'f': {
          var f1 = parts[1].split('/');
          var f2 = parts[2].split('/');
          var f3 = parts[3].split('/');
          Array.prototype.push.apply(
            vertices, positions[parseInt(f1[0]) - 1]);
          Array.prototype.push.apply(
            vertices, normals[parseInt(f1[2]) - 1]);
          Array.prototype.push.apply(
            vertices, positions[parseInt(f2[0]) - 1]);
          Array.prototype.push.apply(
            vertices, normals[parseInt(f2[2]) - 1]);
          Array.prototype.push.apply(
            vertices, positions[parseInt(f3[0]) - 1]);
          Array.prototype.push.apply(
            vertices, normals[parseInt(f3[2]) - 1]);
          break;
        }
      }
    }
  }
  console.log(
    "Loaded mesh with " + (vertices.length / 6) + " vertices");
  return {
    primitiveType: 'TRIANGLES',
    vertices: new Float32Array(vertices),
    vertexCount: vertices.length / 6,
    material: {ambient: 0.2, diffuse: 0.5, shininess: 10.0}
  };
}

function loadMesh(filename) {
  $.ajax({
    url: filename,
    dataType: 'text'
  }).done(function(data) {
    init(loadMeshData(data));
  }).fail(function() {
    alert('Faild to retrieve [' + filename + "]");
  });
}

$(document).ready(function() {
  loadMesh('mug-naily.obj')
});
