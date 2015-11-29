var gl;		// GLコンテキスト

onload = function(){
	// canvasエレメントの取得
	var c = document.getElementById("canvas");

	// GL初期化
	initGL(c);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);		// 指定色でクリア
	gl.clearDepth(1.0);						// デプスのクリア
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// シェーダを生成
	var v_shader = create_shader("vs");
	var f_shader = create_shader("fs");
	var prg = create_program(v_shader, f_shader);	// プログラムのリンク

	// シェーダ変数の取得
	var a_Position = gl.getAttribLocation(prg, "a_Position");
	var a_Normal = gl.getAttribLocation(prg, "a_Normal");
	var a_Color = gl.getAttribLocation(prg, "a_Color");
	var u_ModelM = gl.getUniformLocation(prg, "u_ModelM");
	var u_ViewM = gl.getUniformLocation(prg, "u_ViewM");
	var u_ProjectionM = gl.getUniformLocation(prg, "u_ProjectionM");
	var u_InvModelM = gl.getUniformLocation(prg, "u_InvModelM");
	var u_LightPos = gl.getUniformLocation(prg, "u_LightPos");
	var u_EyeDir = gl.getUniformLocation(prg, "u_EyeDir");
	var u_Ambient = gl.getUniformLocation(prg, "u_Ambient");

	// トーラスモデルの生成
	var torus_data = create_torus(32, 32, 0.5, 1.5, [0.75, 0.25, 0.25, 1.0]);
	var torus_vbo = [create_vbo(torus_data.p), create_vbo(torus_data.n), create_vbo(torus_data.c)];
	var torus_ibo = create_ibo(torus_data.i);

	// 球体モデルの生成
	var sphere_data = create_sphere(32, 32, 1.0, [0.25, 0.75, 0.75, 1.0]);
	var sphere_vbo = [create_vbo(sphere_data.p), create_vbo(sphere_data.n), create_vbo(sphere_data.c)];
	var sphere_ibo = create_ibo(sphere_data.i);
	
	// MVP行列の設定
	var m = new matIV();
	var modelM = m.identity(m.create());
	var viewM = m.identity(m.create());
	var projectionM = m.identity(m.create());
	var invModelM = m.identity(m.create());

	// カメラ位置
	var eyeDir = [0.0, 0.0, 20.0];

	// ビュー行列
	m.lookAt(eyeDir,			// カメラ位置
			 [0.0, 0.0, 0.0],	// 注視点
			 [0.0, 1.0, 0.0],	// カメラの上方向
			 viewM);

	// プロジェクション行列
	m.perspective(45,						// 視野角
					c.width / c.height,		// アスペクト比
					0.1, 100,				// NearZ, FarZ
					projectionM);

	// ライトの位置
	var lightPos = [0.0, 0.0, 0.0];

	// 環境光の色
	var ambientLight = [0.1, 0.1, 0.1, 1.0];

	// Uniformデータを転送
	gl.uniformMatrix4fv(u_ViewM, false, viewM);
	gl.uniformMatrix4fv(u_ProjectionM, false, projectionM);
	gl.uniform3fv(u_LightPos, lightPos);
	gl.uniform3fv(u_EyeDir, eyeDir);
	gl.uniform4fv(u_Ambient, ambientLight);

	// 深度テスト
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	// カリング
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);

	// 描画ループ
	var count = 0;
	(function(){
		gl.clearColor(0.0, 0.0, 0.0, 1.0);		// 指定色でクリア
		gl.clearDepth(1.0);						// デプスのクリア
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// ラジアンの計算
		if (count >= 360) { count = 0; }
		var rad = count * Math.PI / 180;
		var tx = Math.cos(rad) * 3.5;
		var ty = Math.sin(rad) * 3.5;
		var tz = Math.sin(rad) * 3.5;

		// トーラスのVBO、IBOをセット
		set_attribute(torus_vbo,							// VBO
				[a_Position, a_Normal, a_Color],			// シェーダ変数
				[3, 3, 4]);									// 次元
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torus_ibo);	// 登録したインデックスを有効化

		// トーラスのモデル行列を生成
		m.identity(modelM);
		m.translate(modelM, [tx, -ty, -tz], modelM);
		m.rotate(modelM, -rad, [0.0, 1.0, 1.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);
		m.inverse(modelM, invModelM);
		gl.uniformMatrix4fv(u_InvModelM, false, invModelM);

		// トーラスを描画
		gl.drawElements(gl.TRIANGLES, torus_data.i.length, gl.UNSIGNED_SHORT, 0);

		// 球体のVBO、IBOをセット
		set_attribute(sphere_vbo,							// VBO
				[a_Position, a_Normal, a_Color],			// シェーダ変数
				[3, 3, 4]);									// 次元
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere_ibo);	// 登録したインデックスを有効化

		// 球体のモデル行列を生成
		m.identity(modelM);
		m.translate(modelM, [-tx, ty, tz], modelM);
		m.rotate(modelM, rad, [0.0, 1.0, 1.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);
		m.inverse(modelM, invModelM);
		gl.uniformMatrix4fv(u_InvModelM, false, invModelM);

		// 球体を描画
		gl.drawElements(gl.TRIANGLES, sphere_data.i.length, gl.UNSIGNED_SHORT, 0);

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

// IBOを生成
function create_ibo(data) {
	// バッファオブジェクトの生成
	var ibo = gl.createBuffer();

	// データの設定
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	return ibo;
}

// トーラスモデルの生成
// row : パイプの分割数
// column : 円の分割数
// irad : パイプの半径
// orad : 中心からパイプまでの距離
// color : 未指定の場合はHSVで適当に色付けする
function create_torus(row, column, irad, orad, color) {
	var pos = new Array();
	var nor = new Array();
	var col = new Array();
	var idx = new Array();

	// 頂点の生成
	// パイプのループ
	for (var i = 0; i <= row; ++i) {
		var r = i * ((2.0 * Math.PI) / row);
		var rr = Math.cos(r);
		var ry = Math.sin(r);

		// 円のループ
		for (var j = 0; j <= column; ++j) {
			var tr = j * ((2.0 * Math.PI) / column);
			var tx = ((rr * irad) + orad) * Math.cos(tr);
			var ty = ry * irad;
			var tz = ((rr * irad) + orad) * Math.sin(tr);
			pos.push(tx, ty, tz);

			var rx = rr * Math.cos(tr);
			var rz = rr * Math.sin(tr);
			nor.push(rx, ry, rz);

			var tc = [0.0, 0.0, 0.0, 1.0];
			if (color) {
				tc = color;
			}
			else {
				tc = hsva(j * (360 / column), 1, 1, 1);
			}
			col.push(tc[0], tc[1], tc[2], tc[3]);
		}
	}

	// インデックスの生成
	for (var i = 0; i < row; ++i) {
		for (var j = 0; j < column; ++j) {
			var r = ((column + 1) * i) + j;
			idx.push(r, r + column + 1, r + 1);
			idx.push(r + column + 1, r + column + 2, r + 1);
		}
	}

	return {p : pos, n : nor, c : col, i : idx};
}

// 球体の生成
// row : 縦の分割数
// column : 横の分割数
// rad : 球体の半径
// color : 未指定の場合はHSVで適当に色付けする
function create_sphere(row, column, rad, color) {
	var pos = new Array();
	var nor = new Array();
	var col = new Array();
	var idx = new Array();

	// 頂点の生成
	// 縦のループ
	for (var i = 0; i <= row; ++i) {
		var r = i * (Math.PI / row);
		var ry = Math.cos(r);
		var rr = Math.sin(r);

		// 横のループ
		for (var j = 0; j <= column; ++j) {
			var tr = j * ((2.0 * Math.PI) / column);
			var tx = rr * rad * Math.cos(tr);
			var ty = ry * rad;
			var tz = rr * rad * Math.sin(tr);
			pos.push(tx, ty, tz);
			
			var rx = rr * Math.cos(tr);
			var rz = rr * Math.sin(tr);
			nor.push(rx, ry, rz);

			var tc = [0.0, 0.0, 0.0, 1.0];
			if (color) {
				tc = color;
			}
			else {
				tc = hsva(i * (360 / row), 1, 1, 1);
			}
			col.push(tc[0], tc[1], tc[2], tc[3]);
		}
	}

	// インデックスの生成
	for (var i = 0; i < row; ++i) {
		for (var j = 0; j < column; ++j) {
			var r = ((column + 1) * i) + j;
			idx.push(r, r + 1, r + column + 2);
			idx.push(r, r + column + 2, r + column + 1);
		}
	}

	return {p : pos, n : nor, c : col, i : idx};
}


// HSV -> RGB変換
// h : 0～360
// s, v, a : 0～1
function hsva(h, s, v, a) {
	if (s > 1 || v > 1 || a > 1) { return [0.0, 0.0, 0.0, 1.0]; }
	var th = h % 360;
	var i = Math.floor(th / 60);	// Hの値によって場合分け
	var f = th / 60 - i;
	var m = v * (1 - s);
	var n = v * (1 - (s * f));
	var k = v * (1 - (s * (1 - f)));
	var rgba = new Array();
	if (!s > 0 && !s < 0) {
		rgba.push(v, v, v, a);
	}
	else {
		var r = new Array(v, n, m, m, k, v);
		var g = new Array(k, v, v, n, m, m);
		var b = new Array(m, m, k, v, v, n);
		rgba.push(r[i], g[i], b[i], a);
	}
	return rgba;
}
