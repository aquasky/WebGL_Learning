var gl;		// GLコンテキスト
var g_texture = null;	// テクスチャID

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
	var a_Color = gl.getAttribLocation(prg, "a_Color");
	var a_TexCoord = gl.getAttribLocation(prg, "a_TexCoord");
	var u_ModelM = gl.getUniformLocation(prg, "u_ModelM");
	var u_ViewM = gl.getUniformLocation(prg, "u_ViewM");
	var u_ProjectionM = gl.getUniformLocation(prg, "u_ProjectionM");
	var u_Texture = gl.getUniformLocation(prg, "u_Texture");

	// 板ポリの生成
	var position = [
		-1.0,  1.0, 0.0,
		 1.0,  1.0, 0.0,
		-1.0, -1.0, 0.0,
		 1.0, -1.0, 0.0
	];
	var color = [
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
	];
	var texcoord = [
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0,
	];
	var index = [
		0, 1, 2, 3
	];

	// VBO、IBOの生成
	var vbo = [create_vbo(position), create_vbo(color), create_vbo(texcoord)];
	var ibo = create_ibo(index);
	
	// VBO、IBOをセット
	set_attribute(vbo,									// VBO
			[a_Position, a_Color, a_TexCoord],			// シェーダ変数
			[3, 4, 2]);									// 次元
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);		// 登録したインデックスを有効化

	// テクスチャの生成
	gl.activeTexture(gl.TEXTURE0);
	create_texture("yukari_logo.png");
	
	// MVP行列の設定
	var m = new matIV();
	var modelM = m.identity(m.create());
	var viewM = m.identity(m.create());
	var projectionM = m.identity(m.create());
	var invModelM = m.identity(m.create());

	// カメラ位置
	var eyeDir = [0.0, 0.0, 5.0];

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

	// Uniformデータを転送
	gl.uniformMatrix4fv(u_ViewM, false, viewM);
	gl.uniformMatrix4fv(u_ProjectionM, false, projectionM);

	// 深度テスト
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	// 描画ループ
	var count = 0;
	(function(){
		gl.clearColor(0.0, 0.0, 0.0, 1.0);		// 指定色でクリア
		gl.clearDepth(1.0);						// デプスのクリア
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// ラジアンの計算
		if (count >= 360) { count = 0; }
		var rad = count * Math.PI / 180;

		// モデル行列を生成
		m.identity(modelM);
		m.rotate(modelM, -rad, [0.0, 1.0, 1.0], modelM);
		gl.uniformMatrix4fv(u_ModelM, false, modelM);

		// 描画するテクスチャをセット
		gl.bindTexture(gl.TEXTURE_2D, g_texture);
		gl.uniform1i(u_Texture, 0);

		// 描画
		gl.drawElements(gl.TRIANGLE_STRIP, index.length, gl.UNSIGNED_SHORT, 0);

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

// テクスチャを生成
function create_texture(src) {
	// イメージオブジェクトの生成
	var img = new Image();
	
	// 画像読み込み完了時の処理
	img.onload = function(){
		// テクスチャオブジェクトの生成
		var tex = gl.createTexture();
		
		// データの設定
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		g_texture = tex;	// グローバル変数に設定(onloadに戻り値を設定できないため)
	}
	
	// 画像読み込み開始
	img.src = src;
}


