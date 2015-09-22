var gl;		// GLコンテキスト

var triangle_position = [
	 0.0,  1.0, 0.0,
	-1.0,  0.0, 0.0,
	 1.0,  0.0, 0.0
];

var triangle_color = [
	1.0, 0.0, 0.0, 1.0,
	0.0, 1.0, 0.0, 1.0,
	0.0, 0.0, 1.0, 1.0,
];

onload = function(){
	// canvasエレメントの取得
	var c = document.getElementById("canvas");

	// GL初期化
	initGL(c);
	gl.clearColor(0.5, 0.75, 0.75, 1.0);	// 指定色でクリア
	gl.clearDepth(1.0);						// デプスのクリア
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// シェーダを生成
	var v_shader = create_shader("vs");
	var f_shader = create_shader("fs");
	var prg = create_program(v_shader, f_shader);	// プログラムのリンク

	// シェーダ変数の取得
	var a_Position = gl.getAttribLocation(prg, "a_Position");
	var a_Color = gl.getAttribLocation(prg, "a_Color");
	var u_ModelM = gl.getUniformLocation(prg, "u_ModelM");
	var u_ViewM = gl.getUniformLocation(prg, "u_ViewM");
	var u_ProjectionM = gl.getUniformLocation(prg, "u_ProjectionM");

	// VBOの生成
	var position_vbo = create_vbo(triangle_position);
	var color_vbo = create_vbo(triangle_color);
	set_attribute([position_vbo, color_vbo],	// VBO
					[a_Position, a_Color],		// シェーダ変数
					[3, 4]);					// 次元

	// MVP行列の設定
	var m = new matIV();
	var modelM = m.identity(m.create());
	var viewM = m.identity(m.create());
	var projectionM = m.identity(m.create());

	// ビュー行列
	m.lookAt([0.0, 0.0, 5.0],	// カメラ位置
			 [0.0, 0.0, 0.0],	// 注視点
			 [0.0, 1.0, 0.0],	// カメラの上方向
			 viewM);

	// プロジェクション行列
	m.perspective(45,						// 視野角
					c.width / c.height,		// アスペクト比
					0.1, 100,				// NearZ, FarZ
					projectionM);

	// 行列データを転送
	gl.uniformMatrix4fv(u_ViewM, false, viewM);
	gl.uniformMatrix4fv(u_ProjectionM, false, projectionM);

	// 描画ループ
	var count = 0;
	(function(){
		gl.clearColor(0.5, 0.75, 0.75, 1.0);	// 指定色でクリア
		gl.clearDepth(1.0);						// デプスのクリア
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// ラジアンの計算
		if (count >= 360) { count = 0; }
		var rad = count * Math.PI / 180;

		// 1つ目のモデルを描画(円を描くように移動)
		var x = Math.cos(rad);
		var y = Math.sin(rad);
		m.identity(modelM);
		m.translate(modelM, [x, y, 0.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		// 2つ目のモデルを描画(Y軸を中心に回転)
		m.identity(modelM);
		m.translate(modelM, [1.0, -1.0, 0.0], modelM);
		m.rotate(modelM, rad, [0.0, 1.0, 0.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		// 3つ目のモデルを描画(拡大縮小)
		var s = Math.sin(rad) + 1.0;
		m.identity(modelM);
		m.translate(modelM, [-1.0, -1.0, 0.0], modelM);
		m.scale(modelM, [s, s, 0.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		gl.flush();

		++count;
		setTimeout(arguments.callee, 1000 / 30);	// 30フレームでループ
	})();

};

// GL初期化
function initGL(canvas) {
	gl = null;

	try {
		// GLコンテキストの取得
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	}
	catch(e) {
	}

	if (!gl) {
		// 初期化失敗
		alert("Failure initGL()");
		return;
	}
}

// シェーダの生成
function create_shader(id) {
	var scriptElement = document.getElementById(id);	// 指定タグへの参照を取得
	if (!scriptElement) { return; }

	// シェーダオブジェクトの生成
	var shader;
	switch (scriptElement.type) {
		// 頂点シェーダ
		case "x-shader/x-vertex":
			shader = gl.createShader(gl.VERTEX_SHADER);
			break;
		// フラグメントシェーダ
		case "x-shader/x-fragment":
			shader = gl.createShader(gl.FRAGMENT_SHADER);
			break;
		default:
			return;
	};

	gl.shaderSource(shader, scriptElement.text);	// ソースを設定
	gl.compileShader(shader);						// シェーダのコンパイル
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		// コンパイル成功
		return shader;
	}
	else {
		// コンパイル失敗
		alert(gl.getShaderInfoLog(shader));
	}
}

// プログラムの生成とリンク
function create_program(vs, fs) {
	// プログラムオブジェクトの生成
	var program = gl.createProgram();

	// シェーダの割当て
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);	// シェーダのリンク
	if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
		// リンクに成功した場合、シェーダを有効化
		gl.useProgram(program);
		return program;
	}
	else {
		// リンク失敗
		alert(gl.getProgramInfoLog(program));
	}
}

// VBOを生成
function create_vbo(data) {
	// バッファオブジェクトの生成
	var vbo = gl.createBuffer();

	// データの設定
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return vbo;
}

// VBOを登録
function set_attribute(vbo, location, stride) {
	for(var i in vbo) {
		// シェーダ変数の有効化
		gl.enableVertexAttribArray(location[i]);

		// データ転送
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
		gl.vertexAttribPointer(location[i], stride[i], gl.FLOAT, false, 0, 0);
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}
