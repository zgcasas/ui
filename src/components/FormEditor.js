import React, { useCallback, useEffect, useRef, useState } from 'react';
import BackIcon from '@material-ui/icons/ArrowBack';
import FormView from "./FormView";
import { useMediaQuery, withStyles, Fab } from "@material-ui/core/index";
import clsx from 'clsx';
import LoadingButton from "./LoadingButton";
import SwipeableViews from "react-swipeable-views";
import copy from 'copy-to-clipboard/index';
import CopyIcon from '@material-ui/icons/FileCopy';
import SuccessIcon from '@material-ui/icons/CheckCircle';
import Button from '@material-ui/core/Button/index';
import AddIcon from '@material-ui/icons/Add';
import Typography from '@material-ui/core/Typography/index';
import StorageIcon from '@material-ui/icons/Storage';
import ViewIcon from '@material-ui/icons/OpenInNew';
import EditIcon from '@material-ui/icons/Edit';
import zzip from "../util/zzip";
import { of, Subject } from "rxjs";
import { FileDataType } from "../services/DataTypeService";
import FileUploader from "./FileUploader";
import { RecordSubject } from "../services/subjects";

function withForm(item) {
    item.formComponent = formComponentFor(item.dataType);
    item.submitter = new Subject();
    return item;
}

function formComponentFor(dataType) {
    if (dataType.constructor === FileDataType) {
        return FileUploader;
    }
    return FormView;
}

const stackHeaderSpacing = 5;

const styles = theme => ({
    root: {
        height: props => `calc(${props.height})`
    },
    stackHeader: {
        height: theme.spacing(stackHeaderSpacing),
        padding: theme.spacing(1),
        boxSizing: 'border-box'
    },
    formContainer: {
        height: props => `calc(${props.height} - ${theme.spacing(stackHeaderSpacing)}px)`,
        overflow: 'auto',
        boxSizing: 'border-box',
        flexGrow: 1
    },
    jsonContainer: {
        height: props => `calc(${props.height} - ${theme.spacing(stackHeaderSpacing)}px)`,
        overflow: 'auto',
        boxSizing: 'border-box',
        background: theme.palette.background.default,
        color: theme.palette.text.secondary
    },
    jsonBox: {
        width: '50%',
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1)
    },
    mdFormContainer: {
        paddingLeft: '25%',
        paddingRight: '25%',
    },
    smFormContainer: {
        paddingLeft: '15%',
        paddingRight: '15%',
    },
    trailing: {
        height: `${theme.spacing(8)}px`
    },
    fabBack: {
        position: 'absolute',
        top: props => `calc(${props.height} - ${theme.spacing(14)}px)`,
        right: theme.spacing(13),
        color: theme.palette.text.secondary
    },
    fabSave: {
        position: 'absolute',
        top: props => `calc(${props.height} - ${theme.spacing(16)}px)`,
        right: theme.spacing(2)
    },
    fabJson: {
        position: 'absolute',
        top: theme.spacing(8),
        right: theme.spacing(5),
        fontWeight: 'bold',
        color: theme.palette.text.secondary
    },
    fabCopy: {
        position: 'absolute',
        top: theme.spacing(15),
        right: theme.spacing(5),
        color: theme.palette.text.secondary
    },
    okBox: {
        width: '100px',
        minHeight: '100px',
        borderRadius: '50%',
        position: 'relative',
        background: theme.palette.primary.light,
        marginTop: theme.spacing(3),
        marginBottom: theme.spacing(3),
        justifyContent: 'center'
    },
    okIcon: {
        position: 'absolute',
        top: '8px',
        right: 0,
        background: theme.palette.background.paper,
        borderRadius: '50%'
    },
    fullHeight: {
        height: '100%'
    },
    center: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    actionButton: {
        margin: theme.spacing(1)
    },
    okContainer: {
        height: props => props.height,
        overflow: 'auto',
        background: theme.palette.background.default
    },
    successLabel: {
        color: theme.palette.text.secondary
    },
    alignCenter: {
        textAlign: 'center'
    }
});

const FormEditor = ({ docked, dataType, theme, classes, rootId, onSubjectPicked, height, value, readOnly, onUpdate }) => {

    const [id, setId] = useState((value && value.id) || null);
    const initialStack = () => [
        withForm({
            value: { ...value },
            dataType,
            title: () => of('')
        }),
        withForm({
            value: { ...value },
            dataType,
            title: value => dataType.titleFor(value),
            viewport: dataType.titleViewPort('_id'),
            callback: value => {
                setId(value.id);
                if (onUpdate && rootId) {
                    onUpdate(value);
                }
            },
            rootId: value && value.id
        })
    ];
    const ref = useRef(null);
    const stackHeaderRef = useRef(null);
    const [stack, setStack] = useState(initialStack());
    const [stackTitles, setStackTitles] = useState([]);
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);
    const xs = useMediaQuery(theme.breakpoints.down('xs'));
    const md = useMediaQuery(theme.breakpoints.up('md'));
    const [jsonMode, setJsonMode] = useState(false);

    const current = stack[stack.length - 1];

    const onSubmitDone = useCallback(value => {
        if (value) {
            setDone(true);
            setValue({ ...current.value, ...value });
            setTimeout(() => {
                handleBack();
                if (current.callback) {
                    current.callback(value);
                }
                setSaving(false);
            }, 1000);
        } else {
            setSaving(false);
        }
    }, [current]);

    useEffect(() => {
        const subscription = zzip(
            ...stack.map(item => item.title(item.value))
        ).subscribe(titles => setStackTitles(titles));
        return () => subscription.unsubscribe();
    }, [stack.length]);

    useEffect(() => {
        if (saving) {
            setDone(false);
            const subscription = (current.viewport || of('{_id}')).subscribe(
                viewport => current.submitter.next({
                    value: current.value,
                    viewport
                })
            );
            return () => subscription && subscription.unsubscribe();
        }
    }, [saving]);

    const updateCurrent = item => {
        const newStack = [...stack];
        newStack.push({ ...newStack.pop(), ...item });
        setStack(newStack);
    };

    const setValue = value => updateCurrent({ value });

    const updateStack = stack => {
        setStack(stack);
        setTimeout(() => {
            if (stack.length && ref.current) {
                ref.current.scrollTop = (stack[stack.length - 1].scrollTop || 0)
            }
        });
    };

    const handleChange = value => setValue(value);

    const handleStack = item => {
        current.scrollTop = ref.current.scrollTop;
        updateStack([...stack, withForm(item)]);
    };

    const save = () => {
        setSaving(true);

    };

    const handleBack = () => {
        const newStack = [...stack];
        newStack.pop();
        updateStack(newStack);
        setDone(false);
    };

    const handleAddAnother = () => {
        updateStack(initialStack());
        setDone(false);
    };

    let controlHeight = 0;
    if (stackHeaderRef.current) {
        controlHeight = stackHeaderRef.current.getBoundingClientRect().height
    }

    controlHeight = `${height} - ${controlHeight}px`;

    const actions = [];

    if (stack.length > 2 && !saving) {
        actions.push(
            <Fab key='back'
                 size='small'
                 aria-label="back"
                 className={classes.fabBack}
                 onClick={handleBack}>
                <BackIcon/>
            </Fab>
        );
    }

    let jsonView;
    if (stack.length > 1) {
        if (!readOnly) {
            actions.push(
                <LoadingButton key='save'
                               loading={saving && !done}
                               onClick={save}
                               className={classes.fabSave}
                               success={done}/>
            );
        }

        if (md) {
            actions.push(
                <Fab key='json'
                     size='small'
                     aria-label="JSON"
                     className={classes.fabJson}
                     onClick={() => setJsonMode(!jsonMode)}>
                    {'{...}'}
                </Fab>
            );
        }

        if (md && jsonMode) {
            jsonView = <div className={clsx(classes.jsonContainer, classes.jsonBox)}>
                <pre>
                    {JSON.stringify(current.value, null, 2)}
                </pre>
            </div>;

            actions.push(
                <Fab key='copy'
                     size='small'
                     aria-label="JSON"
                     className={classes.fabCopy}
                     onClick={() => copy(JSON.stringify(current.value, null, 2))}>
                    <CopyIcon/>
                </Fab>
            );
        }
    }

    const DataTypeIcon = StorageIcon;

    const successAlert = (
        <div key='successAlert' className={clsx(classes.fullHeight, classes.center, classes.okContainer)}>
            <div className={clsx(classes.okBox, classes.center)}>
                <SuccessIcon className={classes.okIcon} color="primary"/>
                <DataTypeIcon/>
            </div>
            <Typography variant='h5'>
                {stackTitles[1]}
            </Typography>
            <Typography variant='subtitle1' className={clsx(classes.successLabel, classes.alignCenter)}>
                Successfully {rootId ? 'updated' : 'created'}
            </Typography>
            <div className={classes.alignCenter}>
                <Button variant="outlined"
                        color="primary"
                        startIcon={<ViewIcon/>}
                        className={classes.actionButton}>
                    View
                </Button>
                <Button variant="outlined"
                        color="primary"
                        startIcon={<EditIcon/>}
                        className={classes.actionButton}
                        onClick={() => onSubjectPicked(RecordSubject.for(dataType.id, id).key)}>
                    Edit
                </Button>
            </div>
            <Button variant="contained"
                    color="primary"
                    startIcon={<AddIcon/>}
                    onClick={handleAddAnother}
                    className={classes.actionButton}>
                Add another
            </Button>
            <div className={classes.trailing}></div>
        </div>
    );

    const forms = stack.map(
        (item, index) => {
            if (index) {
                const Form = item.formComponent;
                return <Form key={`form_${index}`}
                             dataType={item.dataType}
                             value={item.value}
                             _type={item.value && item.value._type}
                             onChange={handleChange}
                             disabled={saving}
                             readOnly={readOnly}
                             onStack={handleStack}
                             rootId={item.rootId}
                             max={item.max}
                             height={controlHeight}
                             submitter={item.submitter}
                             onSubmitDone={onSubmitDone}
                             onSubjectPicked={onSubjectPicked}/>
            }

            return successAlert;
        }
    );

    return <div className={classes.root}>
        <div ref={stackHeaderRef} className={classes.stackHeader}>
            {stack.length > 1 && stackTitles.join(' ')}
        </div>
        <div style={{ display: 'flex', position: 'relative' }}>
            <div ref={ref}
                 className={
                     clsx(
                         classes.formContainer,
                         !xs && !jsonView && (docked || !md) && classes.smFormContainer,
                         md && ((jsonMode && classes.jsonBox) || classes.mdFormContainer)
                     )}>

                <SwipeableViews axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
                                disabled={true}
                                index={stack.length - 1}>
                    {forms}
                </SwipeableViews>
                <div className={classes.trailing}/>
                {actions}
            </div>
            {jsonView}
        </div>
    </div>;
};

export default withStyles(styles, { withTheme: true })(FormEditor);
