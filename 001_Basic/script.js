var gl;		// GLコンテキスト

var triangle = [
	-0.5, -0.5, 0.0,
	 0.5, -0.5, 0.0,
	 0.0,  0.5, 0.0
];

onload = function(){
	// canvasエレメントの取得
	var c = document.getElementById('canvas');
	c.width = 320;
	c.height = 240;

	// GLコンテキストの取得
	gl = c.getContext('webgl') || c.getContext('experimental-webgl');

	gl.clearColor(0.75, 0.75, 0.5, 1.0);	// 指定色でクリア
	gl.clearDepth(1.0);						// デプスのクリア
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// シェーダを生成
	var v_shader = create_shader('vs');
	var f_shader = create_shader('fs');
	var prg = create_program(v_shader, f_shader);	// プログラムのリンク

	// シェーダ変数の取得
	var a_Position = gl.getAttribLocation(prg, 'a_Position');


	// *** データ設定 *** //
	// VBOの生成
	var vbo = create_vbo(triangle);


	// *** 描画 *** //
	gl.useProgram(prg);

	// シェーダ変数の有効化
	gl.enableVertexAttribArray(a_Position);

	// データ転送
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	// 描画
	gl.drawArrays(gl.TRIANGLES, 0, 3);


	gl.disableVertexAttribArray(a_Position);
	gl.useProgram(null);

	gl.flush();
};

// シェーダの生成
function create_shader(id) {
	var scriptElement = document.getElementById(id);	// 指定タグへの参照を取得
	if (!scriptElement) { return; }

	// シェーダオブジェクトの生成
	var shader;
	switch (scriptElement.type) {
		// 頂点シェーダ
		case 'x-shader/x-vertex':
			shader = gl.createShader(gl.VERTEX_SHADER);
			break;
		// フラグメントシェーダ
		case 'x-shader/x-fragment':
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
		// リンク成功
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
