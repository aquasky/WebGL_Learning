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
	var u_LightDir = gl.getUniformLocation(prg, "u_LightDir");
	var u_Ambient = gl.getUniformLocation(prg, "u_Ambient");

	// トーラスモデルの生成
	var torus_data = create_torus(32, 32, 1.0, 2.0);
	var torus_position = torus_data[0];
	var torus_normal = torus_data[1];
	var torus_color = torus_data[2];
	var torus_index = torus_data[3];

	// VBOの生成
	var position_vbo = create_vbo(torus_position);
	var normal_vbo = create_vbo(torus_normal);
	var color_vbo = create_vbo(torus_color);
	set_attribute([position_vbo, normal_vbo, color_vbo],	// VBO
					[a_Position, a_Normal, a_Color],		// シェーダ変数
					[3, 3, 4]);								// 次元

	// IBOの生成
	var ibo = create_ibo(torus_index);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);	// 登録したインデックスを有効化

	// MVP行列の設定
	var m = new matIV();
	var modelM = m.identity(m.create());
	var viewM = m.identity(m.create());
	var projectionM = m.identity(m.create());
	var invModelM = m.identity(m.create());

	// ビュー行列
	m.lookAt([0.0, 0.0, 20.0],	// カメラ位置
			 [0.0, 0.0, 0.0],	// 注視点
			 [0.0, 1.0, 0.0],	// カメラの上方向
			 viewM);

	// プロジェクション行列
	m.perspective(45,						// 視野角
					c.width / c.height,		// アスペクト比
					0.1, 100,				// NearZ, FarZ
					projectionM);

	// ライトの向き
	var lightDir = [-0.5, 0.5, 0.5];

	// 環境光の色
	var ambientLight = [0.1, 0.1, 0.1, 1.0];

	// Uniformデータを転送
	gl.uniformMatrix4fv(u_ViewM, false, viewM);
	gl.uniformMatrix4fv(u_ProjectionM, false, projectionM);
	gl.uniform3fv(u_LightDir, lightDir);
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

		// モデルを描画(Y軸で回転)
		m.identity(modelM);
		m.rotate(modelM, rad, [0.0, 1.0, 1.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);

		// モデル行列の逆行列を計算
		m.inverse(modelM, invModelM);
		gl.uniformMatrix4fv(u_InvModelM, false, invModelM);

		gl.drawElements(gl.TRIANGLES, torus_index.length, gl.UNSIGNED_SHORT, 0);

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
function create_torus(row, column, irad, orad) {
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
			var tx = (rr * irad + orad) * Math.cos(tr);
			var ty = ry * irad;
			var tz = (rr * irad + orad) * Math.sin(tr);
			pos.push(tx, ty, tz);

			var rx = rr * Math.cos(tr);
			var rz = rr * Math.sin(tr);
			nor.push(rx, ry, rz);

			var tc = hsva(j * (360 / column), 1, 1, 1);
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

	return [pos, nor, col, idx];
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
