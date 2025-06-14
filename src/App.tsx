import * as React from "react";
import "./styles/app.scss";
import { observer } from "mobx-react";
import { gState } from "./state";
import { MainDialog } from "./components/dialog";
import { Loader } from "./components/loader";
import { Editor } from "./components/editor";

@observer
class App extends React.Component {
	render(): React.ReactNode {
		return (
			<div id="app">
				{gState.decodedSTL ? <Editor></Editor> : <Loader />}{" "}
				<MainDialog></MainDialog>
			</div>
		);
	}
}

export default App;
